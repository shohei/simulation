/*----------------------------------------------
  spring_mass3.js
  3次元バネ質点モデル
  3次元弾性体(立方体、球、円柱）を表現
-----------------------------------------------*/
//初期のサイズとバネ全体の自然長は同じとする
function SpringMass3()
{
  this.kind = "CUBE";//3次元SMMを1個の物体とみなしたときの種類（ほかに"SPHERE","CYLINDER")
  this.numPole = 1;
  this.numRow = 10;//1行当たりのバネ個数
  this.numCol = 10;//1列当たりのバネ個数
  this.numStk = 10;//1積当たりのバネ個数
  this.numStruct;
  this.numShear ;
  this.numPoint ;//(this.nnumRow+1) * (this.numCol+1);
  this.numHinge ;
  this.mass = 0.1;//質点１個当たりの質量(kg)
  this.structK = 100;//バネ1個当たり 
  this.shearK = 100;
  this.hingeK = 0;//;
  this.damping = 0.1;//0.5;
  this.drag = 0.1;//0.1;
  this.muK = 0.2;
  this.restitution = 0.2;
  this.lengthX0;  //springの１個当たり自然長
  this.lengthY0;  //springの１個当たり自然長
  this.lengthZ0;  //springの１個当たり自然長
  this.vPos = new Vector3();//3次元SMM全体の中心座標
  this.vVel = new Vector3();//3次元SMM全体の速度
  this.vOmg = new Vector3();//3次元SMM全体の角速度
  this.vSize = new Vector3(1, 1, 1);
  this.vEuler = new Vector3();//3次元SMM全体の姿勢
  this.radius = 0.02 ;//質点の半径
  this.height0 = 2;//初期状態の高さ
	
  this.vForce0 = new Vector3();//外力の初期値
  this.structS = [];//構造バネ
  this.shearS = []; //せん断バネ
  this.hingeS = []; //蝶番バネ
  this.point = [];
  this.pole = [];
  this.shadow = 0;
  this.dispType = "SMM";//"TEX", "CHECK", 
  this.flagShearDisp = false;
　this.object = new Rigid();//2,3次元バネ質点モデル全体を1個のオブジェクトとして描画するときに使用
  this.rigid2;//衝突する剛体
}

SpringMass3.prototype.initialize = function()
{
  if(this.kind == "CUBE") this.initializeCube();
  else if(this.kind == "SPHERE") this.initializeSphere();
  else this.initializeCylinder();
}

//-----------------------------------------------------------------
SpringMass3.prototype.draw = function(gl)
{
  var i, r1, r2;

  if(this.dispType == "SMM")//"SPRING_MASS_MODEL" （ばね質点表示）
  {
    //チェック表示後、剛体が表示されなくなることを防ぐためのダミー
    var dummy = new Rigid();
    dummy.kind ="CHECK_PLATE";//"SPHERE";// 
    dummy.flagCheck = true;
    dummy.nSlice = 20;
    dummy.nStack = 20;
    var n = dummy.initVertexBuffers(gl);
  
    //質点
    n = this.point[0].initVertexBuffers(gl);
    for(i = 0; i < this.numPoint; i++) 
    {
      if(this.point[i].flagFixed == true){
        this.point[i].diffuse = [0.8, 0.2, 0.2, 1.0];
        this.point[i].ambient = [0.4, 0.1, 0.1, 1.0];
      }
      else {
	    this.point[i].diffuse  = [0.2, 0.9, 0.9, 1.0];
	    this.point[i].ambient  = [0.1, 0.5, 0.5, 1.0];
      }
      this.point[i].shadow = this.shadow;
      this.point[i].draw(gl, n);
    }

    var np1, np2;
    //構造バネ
    n = this.structS[0].initVertexBuffers(gl);
    for(i = 0; i < this.numStruct; i++)
    {
      np1 = this.structS[i].np1; np2 = this.structS[i].np2;
      var len = distance(this.point[np1].vPos, this.point[np2].vPos);
      this.structS[i].vSize = new Vector3(this.radius, this.radius, len);
      this.structS[i].vEuler = getEulerZ(this.point[np1].vPos, this.point[np2].vPos);
      this.structS[i].vPos = div(add(this.point[np1].vPos, this.point[np2].vPos), 2.0);

      this.structS[i].shadow = this.shadow;
      this.structS[i].draw(gl, n); 
    }
    //せん断ばね
    if(this.flagShearDisp)
    {
      n = this.shearS[0].initVertexBuffers(gl);
      for(i = 0; i < this.numShear; i++)
      { 
        np1 = this.shearS[i].np1; np2 = this.shearS[i].np2; 
        var len = distance(this.point[np1].vPos, this.point[np2].vPos);
        this.shearS[i].vSize = new Vector3(this.radius, this.radius, len);
        this.shearS[i].vEuler = getEulerZ(this.point[np1].vPos, this.point[np2].vPos);
        this.shearS[i].vPos = div(add(this.point[np1].vPos, this.point[np2].vPos), 2.0);
        this.shearS[i].shadow = this.shadow;
        this.shearS[i].draw(gl, n);
      }
    }
  }

  else //this.dispType == "TEX", "CHECK")
  {//3次元SMM全体を1つのオブジェクトとしてテクスチャ、チェック模様を貼り付ける
    
    this.object.data= [];
    
    this.object.shadow = this.shadow;
    
    if(this.dispType == "TEX")
    {
      if(this.kind == "CUBE") this.object.kind = "GRID_SQUARE";
      else if(this.kind == "SPHERE") this.object.kind = "GRID_SPHERE";
      else if(this.kind == "CYLINDER") this.object.kind = "GRID_CYLINDER";
      
      this.object.flagTexture = true;
      this.object.flagCheck = false;
    }
    else 
    {//"CHECK"
      if(this.kind == "CUBE") this.object.kind = "CHECK_SQUARE";
      else if(this.kind == "SPHERE") this.object.kind = "CHECK_SPHERE";
      else if(this.kind == "CYLINDER") this.object.kind = "CHECK_CYLINDER";
      this.object.col1 = [1.0, 0.2, 0.1, 1.0];
      this.object.col2 = [0.1, 0.8, 0.9, 1.0];
      this.object.flagTexture = false;
      this.object.flagCheck = true;
    }
    if(this.object.flagDebug) {
      this.object.flagTexture = false;
      this.object.flagCheck = false;
    }  
     
    var m;
    if(this.kind == "CUBE")
    {
      //Top(k=0、上部)
      k = 0;
	  for(j = 0; j <= this.numCol; j++)
	  for(i = 0; i <= this.numRow; i++)
      {
        m = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      this.object.nSlice = this.numRow;
      this.object.nStack = this.numCol;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];

      //Front(i=numROW)
//      this.object.data= [];
      i = this.numRow;
	  for(j = 0; j <= this.numCol; j++)
	  for(k = 0; k <= this.numStk; k++)
      {
        m = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      this.object.nSlice = this.numStk;
      this.object.nStack = this.numCol;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];
      
      //Right(j=0,オブジェクト自身から見て右側）
      j = 0;
	  for(k = 0; k <= this.numStk; k++)
	  for(i = this.numRow; i >= 0; i--)
      {
        m = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      this.object.nSlice = this.numRow;
      this.object.nStack = this.numStk;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];

      //Left(j=0,オブジェクト自身から見て左側）
      j = this.numCol;
	  for(i = this.numRow; i >= 0; i--)
	  for(k = 0; k <= this.numStk; k++)
      {
        m = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      this.object.nSlice = this.numStk;
      this.object.nStack = this.numRow;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];

      //Rear(j=0,オブジェクト自身から見て後ろ側）
      i = 0;
	  for(j = this.numCol; j >= 0; j--)
	  for(k = 0; k <= this.numStk; k++)
      {
        m = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      this.object.nSlice = this.numStk;
      this.object.nStack = this.numCol;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];

      //Bottpom(k=numStk,オブジェクト自身から見て下部）
      k = this.numStk;
	  for(j = this.numCol; j >= 0; j--)
	  for(i = 0; i <= this.numRow; i++)
      {
        m = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      this.object.nSlice = this.numRow;
      this.object.nStack = this.numCol;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];
    }
    
    else if(this.kind == "SPHERE")
    {
      // k = 0;Top
      this.object.data.push([this.point[0].vPos.x, this.point[0].vPos.y, this.point[0].vPos.z]);
      
	  for(k = 1; k < this.numStk; k++)
	  for(j = 0; j < this.numCol; j++)
      {
        m = j + (k-1) * this.numCol + 1;
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      k = this.numPoint-2;//球のSMMデータは中心のデータを含む、TEXおよびCHECK表示には中心点は必要ない
      this.object.data.push([this.point[k].vPos.x, this.point[k].vPos.y, this.point[k].vPos.z]);
      this.object.nSlice = this.numCol;
      this.object.nStack = this.numStk;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];//クリア
    }
    else if(this.kind == "CYLINDER")
    {
      // k = 0;Topの中心
      this.object.data.push([this.point[0].vPos.x, this.point[0].vPos.y, this.point[0].vPos.z]);
      //side     
	  for(k = 0; k <= this.numStk; k++)
	  for(j = 0; j < this.numCol; j++)
      {
        m = j + k * (this.numCol + 1) + 1;
        this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      }
      m = this.numStk * (this.numCol+1);//Bottomの中心
      this.object.data.push([this.point[m].vPos.x, this.point[m].vPos.y, this.point[m].vPos.z]);
      this.object.nSlice = this.numCol;
      this.object.nStack = this.numStk;	
      n = this.object.initVertexBuffers(gl);
      this.object.draw(gl, n);
      this.object.data= [];//クリア
    }
  }
} 

//-----------------------------------------------------------------------------
//3次元のバネマスモデル
SpringMass3.prototype.calcSpringMass3 = function(tt)
{                                           
  var i, j, I, J, k, r1, r2, m;
  var vDir1 = new Vector3();//hinge中心から#1へ向かう単位方向ベクトル(他にも使用)
  var vDir2 = new Vector3();//hinge中心から#2へ向かう単位方向ベクトル(他にも使用)
  var vFF = new Vector3();
  var vRelativeVel = new Vector3();
  var vNormal = new Vector3();
  var vG = new Vector3(0.0, 0.0, -gravity * this.mass);//重力ベクトル
  var dampingF, len, len1, len2, angle;
//  var angle0 = Math.PI;
//  var lenShear0 = Math.sqrt(this.lengthX0*this.lengthX0 + this.lengthY0*this.lengthY0);
//console.log("lenS0 = " + lenShear0);
  //力の総和
  //初期設定値（風などの外力）
  for(i = 0; i < this.numPoint; i++){
    this.point[i].vForce = add(this.point[i].vForce0, vG);
  }
  
  //var nrp = this.numRow +1;
  var np1, np2;
  //バネによる力
  for(i = 0; i < this.numStruct; i++)
  {
    //弾性力
    np1 = this.structS[i].np1;
    np2 = this.structS[i].np2;
    vDir1 = direction(this.point[np1].vPos , this.point[np2].vPos);//#1から#2への単位ベクトル
    len = distance(this.point[np1].vPos, this.point[np2].vPos);
//console.log("len = " + len + " lenX0 = " + this.lengthX0 + " lenY0 = " + this.lengthY0);
//if(len < this.structS[i].length0 * 0.8) len = this.structS[i].length0 * 0.8;
//if(len > this.structS[i].length0 * 1.2) len = this.structS[i].length0 * 1.2;
    vFF = mul(this.structK * (len - this.structS[i].length0), vDir1) ;
    this.point[np1].vForce.add(vFF) ;//vDirと同方向
    this.point[np2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVel = sub(this.point[np1].vVel , this.point[np2].vVel);
    dampingF = this.damping * dot(vRelativeVel, vDir1);
    this.point[np1].vForce.sub(mul(dampingF , vDir1));//相対速度とは反対方向
    this.point[np2].vForce.add(mul(dampingF , vDir1));//同方向
  }

  //せん断バネによる力
  if(this.shearK > 0)
  {
    for(i = 0; i < this.numShear; i++)
    {
      np1 = this.shearS[i].np1;
      np2 = this.shearS[i].np2;
      vDir1 = direction(this.point[np1].vPos , this.point[np2].vPos);//#1から#2への単位ベクトル
      len = distance(this.point[np1].vPos, this.point[np2].vPos);
//if(len < this.shearS[i].length0 * 0.8) len = this.shearS[i].length0 * 0.8;
//if(len > this.shearS[i].length0 * 1.2) len = this.shearS[i].length0 * 1.2;
	  vDir1 = direction(this.point[np1].vPos , this.point[np2].vPos); 
      vFF = mul(this.shearK * (len - this.shearS[i].length0), vDir1) ;
      this.point[np1].vForce.add(vFF) ;//vDirと同方向
      this.point[np2].vForce.sub(vFF) ;//反対方向
      //減衰力
      vRelativeVel = sub(this.point[np1].vVel, this.point[np2].vVel);
      dampingF = this.damping * dot(vRelativeVel, vDir1);
      vFF = mul(dampingF, vDir1);
      this.point[np1].vForce.sub(vFF);//相対速度とは反対方向
      this.point[np2].vForce.add(vFF);//同方向
    }
  }
//console.log("e = " + this.restitution + " muK = " + this.muK);
//console.log("damping = " + this.damping + " drag = " + this.drag);
  //粘性抵抗と床面処理
  for(i = 0; i < this.numPoint; i++)
  {
//if(this.point[i].vPos.z > 0.6) console.log(" i = " + i + " pz = " + this.point[i].vPos.z + " vy = " + this.point[i].vVel.y );
//if(this.point[i].vPos.z < 0.1) console.log(" i = " + i + " pz = " + this.point[i].vPos.z + " vy = " + this.point[i].vVel.y );
    if(this.point[i].flagFixed) continue; //固定
    //空気粘性抵抗（全ての質点に一様と仮定)
    this.point[i].vForce.sub(mul(this.drag, this.point[i].vVel));
    //床面処理
    if(this.point[i].vPos.z < this.radius + 0.01)
    {
	  //床面にある質点に対してはすべり摩擦を与える
      this.point[i].vForce.sub(mul(this.muK * this.mass * gravity, norm(this.point[i].vVel)));
      //床面上に制限
      this.point[i].vPos.z = this.radius;
      //床との衝突
      if(this.point[i].vVel.z < 0.0)
      { //質点と床面とは弾性衝突とする
        this.point[i].vVel.z = - this.restitution * this.point[i].vVel.z ;
      }
    }
    //Euler法
    //加速度
    this.point[i].vAcc = div(this.point[i].vForce , this.mass);
    //速度
    this.point[i].vVel.add(mul(this.point[i].vAcc, tt));
    //位置
    this.point[i].vPos.add(mul(this.point[i].vVel, tt));
  }
  //全体の中心位置
  var vPos = new Vector3();
  for(i = 0; i < this.numPoint; i++) vPos.add(this.point[i].vPos);
  this.vPos = div(vPos, this.numPoint);
}

//-----------------------------------------------------------------
SpringMass3.prototype.initializeCube = function()
{
  var i, j, k;
    
  var cnt = 0;
  //質点のサイズ，位置
  for(k = 0; k <= this.numStk; k++)
  for(j = 0; j <= this.numCol; j++)
  for(i = 0; i <= this.numRow; i++)
  { 
    //初期状態では立方体の中心をオブジェクト座標の原点
    this.point[cnt] = new Rigid();
    this.point[cnt].kind = "SPHERE";
    this.point[cnt].vSize = new Vector3(2.0*this.radius, 2.0*this.radius, 2.0*this.radius);
    this.point[cnt].vPos.x = i * this.vSize.x / this.numRow - this.vSize.x / 2;    
    this.point[cnt].vPos.y = j * this.vSize.y / this.numCol - this.vSize.y / 2;
    this.point[cnt].vPos.z =-k * this.vSize.z / this.numStk + this.vSize.z / 2;
    this.point[cnt].vPos = rotate(this.point[cnt].vPos, this.vEuler);//3次元弾性体自身の回転も考慮
    this.point[cnt].vPos.add(this.vPos);//全体の平行移動(this.vPosはサンプル・プログラム側で指定)
    this.point[cnt].vVel = new Vector3();
    this.point[cnt].nSlice = 6;
    this.point[cnt].nStack = 6;
    cnt ++;
  }
  this.numPoint = cnt;

  //バネに接続する質点番号（row,col,stkで指定）など
  var np1, np2;
  cnt = 0;
  //ｘ軸に平行なバネ
  for(k = 0; k <= this.numStk; k++)
  for(j = 0; j <= this.numCol; j++)
  for(i = 0; i < this.numRow; i++)
  {
    this.structS[cnt] = new Rigid();
    this.structS[cnt].kind = "CYLINDER";
    this.structS[cnt].numSlice = 6;
    this.structS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    np2 = i+1 + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    this.structS[cnt].np1 = np1;
    this.structS[cnt].np2 = np2;
    this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    
    cnt++;
  }
  //ｙ軸に平行なバネ
  for(k = 0; k <= this.numStk; k++)
  for(j = 0; j < this.numCol; j++)
  for(i = 0; i <= this.numRow; i++)
  {
    this.structS[cnt] = new Rigid();
    this.structS[cnt].kind = "CYLINDER";
    this.structS[cnt].numSlice = 6;
    this.structS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    np2 = i + (j+1)*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    this.structS[cnt].np1 = np1;
    this.structS[cnt].np2 = np2;
    this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
  }
  //ｚ軸に平行なバネ
  for(k = 0; k < this.numStk; k++)
  for(j = 0; j <= this.numCol; j++)
  for(i = 0; i <= this.numRow; i++)
  {
    this.structS[cnt] = new Rigid();
    this.structS[cnt].kind = "CYLINDER";
    this.structS[cnt].numSlice = 6;
    this.structS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    np2 = i + j*(this.numRow+1) + (k+1)*(this.numRow+1)*(this.numCol+1);
    this.structS[cnt].np1 = np1;
    this.structS[cnt].np2 = np2;
    this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
  }
  this.numStruct = cnt;
  
  //せん断バネ
  cnt = 0;
  //x-y平面
  for(k = 0; k <= this.numStk; k++)
  for(j = 0; j < this.numCol; j++)
  for(i = 0; i < this.numRow; i++)
  {
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    np2 = i+1 + (j+1)*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    np1 = i+1 + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    np2 = i + (j+1)*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    //this.shearS[cnt].row1 = i+1; this.shearS[cnt].col1 = j;  this.shearS[cnt].stk1 = k;
    //this.shearS[cnt].row2 = i;   this.shearS[cnt].col2 = j+1;this.shearS[cnt].stk2 = k;
    cnt++;
  }
  //y-z平面
  for(k = 0; k < this.numStk; k++)
  for(j = 0; j < this.numCol; j++)
  for(i = 0; i <= this.numRow; i++)
  {
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    np2 = i + (j+1)*(this.numRow+1) + (k+1)*(this.numRow+1)*(this.numCol+1);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + (k+1)*(this.numRow+1)*(this.numCol+1);
    np2 = i + (j+1)*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
  }
  //x-z平面
  for(k = 0; k < this.numStk; k++)
  for(j = 0; j <= this.numCol; j++)
  for(i = 0; i < this.numRow; i++)
  {
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    np2 = i+1 + j*(this.numRow+1) + (k+1)*(this.numRow+1)*(this.numCol+1);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    np1 = i + j*(this.numRow+1) + (k+1)*(this.numRow+1)*(this.numCol+1);
    np2 = i+1 + j*(this.numRow+1) + k*(this.numRow+1)*(this.numCol+1);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
  }
  this.numShear = cnt;
}

//-----------------------------------------------------------------------------
SpringMass3.prototype.initializeSphere = function()
{
  var j, jp, kp, k, np, np1, np2, cnt;
  var phi, theta;
  var rx, ry, rz;//弾性体球全体の半径

  //半径
  rx = this.vSize.x / 2.0;
  ry = this.vSize.y / 2.0;
  rz = this.vSize.z / 2.0;
  //全質点個数
  this.numPoint = (this.numStk-1) * this.numCol + 3;
//alert("numPoint = " + this.numPoint);
  for(i = 0; i < this.numPoint; i++)  
  {
    this.point[i] = new Rigid();
    this.point[i].kind = "SPHERE";
    this.point[i].vSize = new Vector3(2.0*this.radius, 2.0*this.radius, 2.0*this.radius);
  }
  //numStk---z軸方向のバネ個数
  //numCol---x-y面（方位角，経度）のバネ個数
  //中心にも質点を置く（numPoint-1番目)

  //質点のサイズ，位置
  //Top
  np = 0;
  this.point[0].vPos.x = 0.0; //x座標
  this.point[0].vPos.y = 0.0; //y
  this.point[0].vPos.z = rz;//z軸方向の半径
  this.point[0].vPos = rotate(this.point[0].vPos, this.vEuler);
  this.point[0].vPos.add(this.vPos);
  //Bottom
  np = this.numPoint - 2;
  this.point[np].vPos.x = 0.0; //x座標
  this.point[np].vPos.y = 0.0; //y
  this.point[np].vPos.z = - rz;//z
  this.point[np].vPos = rotate(this.point[np].vPos, this.vEuler);
  this.point[np].vPos.add(this.vPos);
//console.log("np="+np + " x= "+this.point[np].vPos.x+" y= "+ this.point[np].vPos.y+" z = "+this.point[np].vPos.z);
  for(k = 1; k < this.numStk; k++)
  {
    theta = Math.PI/2.0 - Math.PI*k/this.numStk;
    for(j = 0; j < this.numCol; j++)
    { //真後ろをj=0
      np = (k-1)*this.numCol + j + 1;
	  phi = 2.0*Math.PI*j/this.numCol;
	  this.point[np].vPos.x = -rx*Math.cos(phi)*Math.cos(theta); //x座標
	  this.point[np].vPos.y = -ry*Math.sin(phi)*Math.cos(theta); //y
	  this.point[np].vPos.z = rz*Math.sin(theta);             //z
	  this.point[np].vPos = rotate(this.point[np].vPos, this.vEuler);
	  this.point[np].vPos.add(this.vPos);
//console.log("np="+np + " x= "+this.point[np].vPos.x+" y= "+ this.point[np].vPos.y+" z = "+this.point[np].vPos.z);
    }
  }
  //中心（球だけ中心にも質点)
  np = this.numPoint-1;
  this.point[np].vPos = this.vPos;
  //バネのx,y,z座標(原点に近い質点で定義）と回転角
  //バネに接続する質点番号
  //横方向
  cnt = 0;
  for(k = 1; k < this.numStk; k++)
  for(j = 0; j < this.numCol; j++)
  {
    np1 = (k-1)*this.numCol + j + 1;
    jp = j + 1;
    if(jp == this.numCol) jp = 0;
    np2 = (k-1)*this.numCol + jp + 1;
    this.structS[cnt] = new Rigid();
    this.structS[cnt].vPos = this.point[np1].vPos;
    this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    this.structS[cnt].np1 = np1;
    this.structS[cnt].np2 = np2;
    cnt++;
  }

  //縦方向
  k = 0;  //Top
  for(j = 0; j < this.numCol; j++)
  {
    np1 = 0;
    np2 = j + 1;
    this.structS[cnt] = new Rigid();
    //this.structS[cnt].vPos =this.point[np1].vPos;
    this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    this.structS[cnt].np1 = np1;
    this.structS[cnt].np2 = np2;
    cnt++;
  }
  //中間
  for(k = 1; k < this.numStk-1; k++)
  {
    kp = k + 1;
    for(j = 0; j < this.numCol; j++)
    {
      np1 = (k-1)*this.numCol + j + 1;
      np2 = (kp-1)*this.numCol + j + 1;
      this.structS[cnt] = new Rigid();
      //this.structS[cnt].vPos = this.point[np1].vPos;
      this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
      this.structS[cnt].np1 = np1;
      this.structS[cnt].np2 = np2;
      cnt++;
    }
  }
  k = this.numStk-1;//Botom
  for(j = 0; j < this.numCol; j++)
  {
    np1 = (k-1)*this.numCol + j + 1;
    np2 = this.numPoint - 2;
    this.structS[cnt] = new Rigid();
    //this.structS[cnt].vPos = this.point[np1].vPos;
    this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    this.structS[cnt].np1 = np1;
    this.structS[cnt].np2 = np2;
    cnt++;
  }
  //中心と質点間(中心に質点を)
  for(k = 0; k < this.numPoint-1; k++)
  {
    np1 = k;
    np2 = this.numPoint-1;//中心
    this.structS[cnt] = new Rigid();
    this.structS[cnt].np1 = np1;
    this.structS[cnt].np2 = np2;
    //this.structS[cnt].vPos = this.point[np1].vPos;
    this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    cnt++;
  }
  this.numStruct = cnt;
//alert("numStruct = " + this.numStruct);   
  for(i = 0; i < this.numStruct; i++)
  {
    this.structS[i].kind = "CYLINDER";
    this.structS[i].numSlice = 6;
    this.structS[i].radiusRatio = 1 ;
  }
  //せん断バネ
  cnt = 0;
  for(k = 1; k < this.numStk-1; k++)
  for(j = 0; j < this.numCol; j++)
  {
    jp = j + 1;
    if(jp == this.numCol) jp = 0;
    np1 = (k-1) * this.numCol + j + 1;
    np2 = k * this.numCol + jp + 1;
    this.shearS[cnt] = new Rigid();
    //this.shearS[cnt].vPos = this.point[np1].vPos;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    cnt++;
    np1 = (k-1) * this.numCol + jp + 1;
    np2 = k * this.numCol + j + 1;
    this.shearS[cnt] = new Rigid();
    //this.shearS[cnt].vPos = this.point[np1].vPos;
    this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
    this.shearS[cnt].np1 = np1;
    this.shearS[cnt].np2 = np2;
    cnt++;
  }
  this.numShear = cnt;
  for(i = 0; i < this.numShear; i++)
  {
    this.shearS[i].kind = "CYLINDER";
    this.shearS[i].numSlice = 6;
    this.shearS[i].radiusRatio = 1 ;
  }
}

//-----------------------------------------------------------------------------
SpringMass3.prototype.initializeCylinder = function()
{
  var j, jp, k, n, np1, np2, cnt;
  var phi, rx, ry, h;

  rx = this.vSize.x / 2.0;
  ry = this.vSize.y / 2.0;
  h = this.vSize.z;
  lengthZ0 = h / this.numStk;

  this.numPoint = (this.numStk+1) * (this.numCol + 1);
//alert(" numPoint = " + this.numPoint);
  for(i = 0; i < this.numPoint; i++)  
  {
    this.point[i] = new Rigid();
    this.point[i].kind = "SPHERE";
    this.point[i].vSize = new Vector3(2.0*this.radius, 2.0*this.radius, 2.0*this.radius);
  }
  //numStk---z軸方向の個数
  //numCol---x-y面（方位角，経度,格段の上底下底の中心にも質点を置く）
                   //円周の質点個数＋1（０番目が中心)

  //質点の位置
  for(k = 0; k <= this.numStk; k++)
  {
    //中心軸上
    n = k * (this.numCol+1);
    this.point[n].vPos.x = 0.0; //x
    this.point[n].vPos.y = 0.0; //y
    this.point[n].vPos.z = -k * lengthZ0 + h / 2.0;//z
    this.point[n].vPos = rotate(this.point[n].vPos, this.vEuler);
    this.point[n].vPos.add(this.vPos);
    //円周上
    for(j = 0; j < this.numCol; j++)
    { //真後ろをj=0
      n = k * (this.numCol+1) + j + 1;
      phi = 2.0* Math.PI* j / this.numCol;
      this.point[n].vPos.x = -rx * Math.cos(phi); //x座標
      this.point[n].vPos.y = -ry * Math.sin(phi); //y
      this.point[n].vPos.z = -k * lengthZ0 + h / 2.0;//z
      this.point[n].vPos = rotate(this.point[n].vPos, this.vEuler);
      this.point[n].vPos.add(this.vPos);
    }
  }
  //構造バネのx,y,z座標
  //バネに接続する質点番号
  cnt = 0;
  for(k = 0; k <= this.numStk; k++)
  {
    //中心と円周上の質点
    for(j = 1; j <= this.numCol; j++)
    {
      np1 = k * (this.numCol + 1);//中心
      np2 = k * (this.numCol + 1) + j;
      this.structS[cnt] = new Rigid();
      //this.structS[cnt].vPos = this.point[np1].vPos;
      this.structS[cnt].length0 = distance(this.point[np1].vPos,this.point[np2].vPos);
      this.structS[cnt].np1 = np1;
      this.structS[cnt].np2 = np2;
      cnt++;
    }
    //横方向（円周上の質点間）
    for(j = 1; j <= this.numCol; j++)
    {
      np1 = k * (this.numCol+1) + j ;
      jp = j + 1;
      if(jp == this.numCol+1) jp = 1;
      np2 = k * (this.numCol+1) + jp;
      this.structS[cnt] = new Rigid();
            //this.structS[cnt].vPos =this.point[np1].vPos;
      this.structS[cnt].length0 = distance(this.point[np1].vPos,this.point[np2].vPos);
      this.structS[cnt].np1 = np1;
      this.structS[cnt].np2 = np2;
      cnt++;
    }
  }
  //縦方向（上下の中心間および円周間)
  for(k = 0; k < this.numStk; k++)
  {
    for(j = 0; j <= this.numCol; j++)
    {
      np1 = k * (this.numCol+1) + j;
      np2 = (k+1) * (this.numCol+1) + j;
      this.structS[cnt] = new Rigid();
         //this.structS[cnt].vPos = this.point[np1].vPos;
      this.structS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
      this.structS[cnt].np1 = np1;
      this.structS[cnt].np2 = np2;
      cnt++;
    }
  }
  this.numStruct = cnt;
  for(i = 0; i < this.numStruct; i++)
  {
    this.structS[i].kind = "CYLINDER";
    this.structS[i].numSlice = 6;
    this.structS[i].radiusRatio = 1 ;
  }

  //円周上のせん断バネ
  cnt = 0;
  for(k = 0; k < this.numStk; k++)
  {
    for(j = 0; j < this.numCol; j++)
    {
      jp = j + 1;
      if(jp == this.numCol) jp = 0;
      np1 = k * (this.numCol+1) + j + 1;
      np2 = (k+1) * (this.numCol+1) + jp + 1;
      this.shearS[cnt] = new Rigid();
      this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
      this.shearS[cnt].np1 = np1;
      this.shearS[cnt].np2 = np2;
      cnt++;
      np1 = k * (this.numCol+1) + jp + 1;
      np2 = (k+1) * (this.numCol+1) + j + 1;
      this.shearS[cnt] = new Rigid();
      this.shearS[cnt].vPos = this.point[np1].vPos;
      this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
      this.shearS[cnt].np1 = np1;
      this.shearS[cnt].np2 = np2;
      cnt++;
    }
  }
/*
  //せん断バネ(各要素の中心の反対側と結ぶ）
  for(k = 0; k < this.numStk; k++)
  {
    for(j = 1; j <= this.numCol; j++)
    {
      jp = this.numCol/2 + j;
      if(jp > this.numCol) jp -= this.numCol;
      np1 = k * (this.numCol+1) + j;
      np2 = (k+1) * (this.numCol+1) + jp;
      this.shearS[cnt] = new Rigid();
      //this.shearS[cnt].vPos = this.point[np1].vPos;
console.log(" np1 = " + np1 + " np2 = " + np2);
      this.shearS[cnt].length0 = distance(this.point[np1].vPos, this.point[np2].vPos);
      this.shearS[cnt].np1 = np1;
      this.shearS[cnt].np2 = np2;
      cnt++;
    }
  }*/
  this.numShear = cnt;
  for(i = 0; i < this.numShear; i++)
  {
    this.shearS[i].kind = "CYLINDER";
    this.shearS[i].numSlice = 6;
    this.shearS[i].radiusRatio = 1 ;
  }
}



