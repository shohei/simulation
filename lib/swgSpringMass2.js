/*----------------------------------------------
  spring_mass2.js
  2次元バネ質点モデル
  布やゴム板など2次元弾性体を表現
-----------------------------------------------*/
var gravity = 9.8;
//剛体の衝突に必要なパラメータ
var restitution = 0.5;
var muK = 0.2;
//var dampRotation = 3;//水平面内の摩擦による減衰

function SpringMass2()
{

  this.flagCollision = false;//衝突処理有効/無効
  this.numPole = 1;
  this.numRow = 10;//1行当たりのバネ個数
  this.numCol = 10;//1列当たりのバネ個数
  this.numStruct = 220;
  this.numShear = 200;
  this.numPoint = 121;//(this.nnumRow+1) * (this.numCol+1);
  this.numHinge = 121;
  this.mass = 0.1;//質点１個当たりの質量(kg)
  this.structK = 100;//バネ1個当たり 
  this.shearK = 100;
  this.hingeK = 0;//;
  this.damping = 0.1;//0.5;
  this.drag = 0.1;//0.1;
  this.muK = 0.2;
  this.restitution = 0.2;
  this.totalLenX = 1.0;//ｘ軸方向全体の長さ
  this.totalLenY = 1.0;//ｙ軸方向全体の長さ
  this.lengthX0;  //springの１個当たり自然長
  this.lengthY0;  //springの１個当たり自然長
  this.vPos = new Vector3();
  this.vEuler = new Vector3();//2次元SMM全体の姿勢
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
　this.object = new Rigid();//2次元バネ質点モデル全体を1個のオブジェクトとして描画するときに使用
  this.rigid2;//衝突する剛体
}

//-----------------------------------------------------------------
SpringMass2.prototype.initialize = function()
{
  var i, j, cnt;
    
  cnt = 0;
  //質点のサイズ，位置
  for(j = 0; j <= this.numCol; j++)
  for(i = 0; i <= this.numRow; i++)
  {//基本姿勢はxy平面
    this.point[cnt] = new Rigid();
    this.point[cnt].kind = "SPHERE";
    this.point[cnt].vSize = new Vector3(2.0*this.radius, 2.0*this.radius, 2.0*this.radius);
    this.point[cnt].vPos.x = i * this.totalLenX / this.numRow;
    this.point[cnt].vPos.y = j * this.totalLenY / this.numCol;
    this.point[cnt].vPos.z = 0.0;
    this.point[cnt].vPos = rotate(this.point[cnt].vPos, this.vEuler);
    this.point[cnt].vPos.add(this.vPos);//全体の平行移動(this.vPosはサンプル・プログラム側で指定)
    this.point[cnt].vVel = new Vector3();
    this.point[cnt].nSlice = 6;
    this.point[cnt].nStack = 6;
//alert("i="+i+" j="+j+" n="+cnt+" x="+this.point[cnt].vPos.x + " y="+this.point[cnt].vPos.y + " z="+this.point[cnt].vPos.z);
    cnt ++;
  }
  this.numPoint = cnt;

  //バネに接続する質点番号（row,colで指定）など
  //ｘ軸に平行な構造バネ
  cnt = 0;
  for(j = 0; j <= this.numCol; j++)
  for(i = 0; i < this.numRow; i++)
  {
    this.structS[cnt] = new Rigid();
    this.structS[cnt].kind = "CYLINDER";
    this.structS[cnt].numSlice = 6;
    this.structS[cnt].radiusRatio = 1 ;
    this.structS[cnt].row1 = i;
    this.structS[cnt].col1 = j;
    this.structS[cnt].row2 = i + 1;
    this.structS[cnt].col2 = j;
    cnt++;
  }
  //ｙ軸に平行な構造バネ
  for(j = 0; j < this.numCol; j++)
  for(i = 0; i <= this.numRow; i++)
  {
      this.structS[cnt] = new Rigid();
      this.structS[cnt].kind = "CYLINDER";
      this.structS[cnt].numSlice = 6;
      this.structS[cnt].radiusRatio = 1 ;
      this.structS[cnt].row1 = i;
      this.structS[cnt].col1 = j;
      this.structS[cnt].row2 = i;
      this.structS[cnt].col2 = j + 1;
      cnt++;
  }
  this.numStruct = cnt;
  
  //せん断バネ
  cnt = 0;
  for(j = 0; j < this.numCol; j++)
  for(i = 0; i < this.numRow; i++)
  {
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    this.shearS[cnt].row1 = i;   this.shearS[cnt].col1 = j;
    this.shearS[cnt].row2 = i+1; this.shearS[cnt].col2 = j+1;
    cnt++;
    this.shearS[cnt] = new Rigid();
    this.shearS[cnt].kind = "CYLINDER";
    this.shearS[cnt].numSlice = 6;
    this.shearS[cnt].radiusRatio = 1 ;
    this.shearS[cnt].row1 = i+1; this.shearS[cnt].col1 = j;
    this.shearS[cnt].row2 = i;   this.shearS[cnt].col2 = j+1;
    cnt++;
  }
  this.numShear = cnt;

  //ヒンジバネを考慮
  var nr = this.numRow;
  var nc = this.numCol;
  this.numHinge = (nr+1) * (nc+1);
  for(i = 0; i < this.numHinge; i++) this.hingeS[i] = new Rigid();

  //角にはヒンジバネを置かない
  //隣接する質点番号，ペア個数
  //j = 0
  for(i = 1; i < this.numRow; i++)
  {
    this.hingeS[i].num = 1;//ペア個数
    this.hingeS[i].row[0] = i-1; this.hingeS[i].col[0] = 0;
    this.hingeS[i].row[1] = i+1; this.hingeS[i].col[1] = 0;
  }
  //j = numCol
  for(i = 1; i < this.numRow; i++)
  {
    this.hingeS[i+nc*(nr+1)].num = 1;
    this.hingeS[i+nc*(nr+1)].row[0] = i-1; this.hingeS[i+nc*(nr+1)].col[0] = nc;
    this.hingeS[i+nc*(nr+1)].row[1] = i+1; this.hingeS[i+nc*(nr+1)].col[1] = nc;
  }
  //i = 0
  for(j = 1; j < this.numCol; j++)
  {
    this.hingeS[j*(nr+1)].num = 1;
    this.hingeS[j*(nr+1)].row[0] = 0; this.hingeS[j*(nr+1)].col[0] = j-1;
    this.hingeS[j*(nr+1)].row[1] = 0; this.hingeS[j*(nr+1)].col[1] = j+1;
  }
  //i = numRow
  for(j = 1; j < this.numCol; j++)
  {
    this.hingeS[nr+j*(nr+1)].num = 1;
    this.hingeS[nr+j*(nr+1)].row[0] = nr; this.hingeS[nr+j*(nr+1)].col[0] = j-1;
    this.hingeS[nr+j*(nr+1)].row[1] = nr; this.hingeS[nr+j*(nr+1)].col[1] = j+1;
  }
  //inside
  for(i = 1; i < this.numRow; i++)
    for(j = 1; j < this.numCol; j++)
    {
      this.hingeS[i+j*(nr+1)].num = 2;
      this.hingeS[i+j*(nr+1)].row[0] = i-1; this.hingeS[i+j*(nr+1)].col[0] = j;
      this.hingeS[i+j*(nr+1)].row[1] = i+1; this.hingeS[i+j*(nr+1)].col[1] = j;
      this.hingeS[i+j*(nr+1)].row[2] = i  ; this.hingeS[i+j*(nr+1)].col[2] = j-1;
      this.hingeS[i+j*(nr+1)].row[3] = i  ; this.hingeS[i+j*(nr+1)].col[3] = j+1;
    }
    
  //pole
  for(i = 0; i < this.numPole; i++)
  {
    this.pole[i] = new Rigid();
    this.pole[i].kind = "CYLINDER";
    this.pole[i].mass = 100;
    this.pole[i].vVel = new Vector3();//固定
    if(i < 4) this.pole[i].vSize = new Vector3(0.06, 0.06, this.height0);
    this.pole[i].radiusRatio = 1 ;
    this.pole[i].nSlice = 6;
    this.pole[i].diffuse = [0.8, 0.4, 0.2, 1.0];
    this.pole[i].ambient = [0.4, 0.2, 0.1, 1.0];
	this.pole[i].specular = [0.6, 0.6, 0.6, 1.0];
  }
  if(this.numPole == 1)
    this.pole[0].vPos = new Vector3(0, 0, this.height0/2);
  else if(this.numPole >= 4)
  {
    this.pole[0].vPos = new Vector3(-this.totalLenX/2, -this.totalLenY/2, this.height0/2);
    this.pole[1].vPos = new Vector3( this.totalLenX/2, -this.totalLenY/2, this.height0/2);
    this.pole[2].vPos = new Vector3( this.totalLenX/2,  this.totalLenY/2, this.height0/2);
    this.pole[3].vPos = new Vector3(-this.totalLenX/2,  this.totalLenY/2, this.height0/2);
    if(this.numPole == 8)
    {
      this.pole[4].vPos = new Vector3(0, -this.totalLenY/2, this.height0);
      this.pole[4].vSize = new Vector3(0.06, 0.06, this.totalLenX);
      this.pole[4].vEuler = new Vector3(0, 90, 0);
      this.pole[5].vPos = new Vector3(this.totalLenX/2,  0, this.height0);
      this.pole[5].vSize = new Vector3(0.06, 0.06, this.totalLenY);
      this.pole[5].vEuler = new Vector3(90, 0, 0);
      this.pole[6].vPos = new Vector3(0,  this.totalLenY/2, this.height0);
      this.pole[6].vSize = new Vector3(0.06, 0.06, this.totalLenX);
      this.pole[6].vEuler = new Vector3(0, 90, 0);
      this.pole[7].vPos = new Vector3(-this.totalLenX/2, 0, this.height0);
      this.pole[7].vSize = new Vector3(0.06, 0.06, this.totalLenY);
      this.pole[7].vEuler = new Vector3(90, 0, 0);
    }    
  }

}

//-----------------------------------------------------------------
SpringMass2.prototype.draw = function(gl)
{
  var i, r1, r2;

  if(this.dispType == "SMM")//"SPRING_MASS_MODEL"
  {//ばね質点表示
    //質点
    var n = this.point[0].initVertexBuffers(gl);
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

    var nrp = this.numRow+1;
    //構造バネ
    n = this.structS[0].initVertexBuffers(gl);
    for(i = 0; i < this.numStruct; i++)
    {
      r1 = this.structS[i].row1; c1 = this.structS[i].col1;
      r2 = this.structS[i].row2; c2 = this.structS[i].col2;
      var len = distance(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos);
      this.structS[i].vSize = new Vector3(this.radius, this.radius, len);
      this.structS[i].vEuler = getEulerZ(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos);
      this.structS[i].vPos = div(add(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos), 2.0);
      this.structS[i].shadow = this.shadow;
      this.structS[i].draw(gl, n); 
    }
    //せん断ばね
    if(this.flagShearDisp)
    {
      n = this.shearS[0].initVertexBuffers(gl);
      for(i = 0; i < this.numShear; i++)
      { 
        r1 = this.shearS[i].row1; c1 = this.shearS[i].col1;
        r2 = this.shearS[i].row2; c2 = this.shearS[i].col2;
        var len = distance(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos);
        this.shearS[i].vSize = new Vector3(this.radius, this.radius, len);
        this.shearS[i].vEuler = getEulerZ(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos);
        this.shearS[i].vPos = div(add(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos), 2.0);
        this.shearS[i].shadow = this.shadow;
        this.shearS[i].draw(gl, n);
      }
    }
  }
  else if(this.dispType == "TEX")
  {//旗全体を1つのオブジェクトとしてテクスチャを貼り付ける
    this.object.data = [];
    this.object.kind = "GRID_SQUARE";
    this.object.nSlice = this.numRow;
    this.object.nStack = this.numCol;
    this.object.shadow = this.shadow;
    this.object.flagTexture = true;
    this.object.flagCheck = false;
    if(this.object.flagDebug) this.object.flagTexture = false;
    
    for(i = 0; i < this.numPoint; i++){
//console.log("AAA i = " + i + " x = " + this.point[i].vPos.x +  " y = " + this.point[i].vPos.y +  " z = " + this.point[i].vPos.z);
      this.object.data.push([this.point[i].vPos.x, this.point[i].vPos.y, this.point[i].vPos.z]);
    }

    n = this.object.initVertexBuffers(gl);
    this.object.draw(gl, n);
  }
  else if(this.dispType == "CHECK")
  {
    this.object.data = [];
    this.object.kind = "CHECK_SQUARE";
    this.object.nSlice = this.numRow;
    this.object.nStack = this.numCol;
    this.object.shadow = this.shadow;
    this.object.col1 = [1.0, 0.2, 0.1, 1.0];
    this.object.col2 = [0.1, 0.8, 0.9, 1.0];
    this.object.flagCheck = true;
    this.object.flagTexture = false;
    if(this.object.flagDebug) this.object.flagCheck = false;
    
    for(i = 0; i < this.numPoint; i++){
      this.object.data.push([this.point[i].vPos.x, this.point[i].vPos.y, this.point[i].vPos.z]);
    }
    n = this.object.initVertexBuffers(gl);
    this.object.draw(gl, n);
    //格子数の少ないチェック模様を描画した後に剛体が表示されなくなることを防ぐため
    var dummy = new Rigid();
    dummy.kind = "CHECK_PLATE";
    dummy.flagCheck = true;
    dummy.nSlice = 20;
    dummy.nStack = 20;
    n = dummy.initVertexBuffers(gl);
  }
 
  //ポール
  if(this.numPole >= 1) n = this.pole[0].initVertexBuffers(gl);
  for(i = 0; i < this.numPole; i++)
  {
    this.pole[i].shadow = this.shadow;
    this.pole[i].draw(gl, n);
  }
  
}

//-----------------------------------------------------------------------------
//2次元のバネマスモデル(hinge springも考慮，３次元空間で運動)
SpringMass2.prototype.calcSpringMass2 = function(tt)
{                                           
  var i, j, k, r1, r2, m;
  var vDir1 = new Vector3();//hinge中心から#1へ向かう単位方向ベクトル(他にも使用)
  var vDir2 = new Vector3();//hinge中心から#2へ向かう単位方向ベクトル(他にも使用)
  var vFF = new Vector3();
  var vRelativeVel = new Vector3();
  var vNormal = new Vector3();
  var vG = new Vector3(0.0, 0.0, -gravity * this.mass);//重力ベクトル
  var dampingF, len, len1, len2, angle;
  var angle0 = Math.PI;
  var lenShear0 = Math.sqrt(this.lengthX0*this.lengthX0 + this.lengthY0*this.lengthY0);

  //力の総和
  //初期設定値（風などの外力）
  for(i = 0; i < this.numPoint; i++){
    this.point[i].vForce = add(this.point[i].vForce0, vG);
  }
  
  var nrp = this.numRow +1;
  //バネによる力
  for(i = 0; i < this.numStruct; i++)
  {
    //弾性力
    r1 = this.structS[i].row1; c1 = this.structS[i].col1;
    r2 = this.structS[i].row2; c2 = this.structS[i].col2;
//console.log("i = " + i + " r1 = " + r1 + "  r2 = " + r2 + " c1 = " + c1 + "  c2 = " + c2);
    vDir1 = direction(this.point[r1+c1*nrp].vPos , this.point[r2+c2*nrp].vPos);//#1から#2への単位ベクトル
//console.log("x = " + vDir1.x + " y = " + vDir1.y + " z = " + vDir1.z)
    len = distance(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos);
//console.log("len = " + len + " lenX0 = " + this.lengthX0 + " lenY0 = " + this.lengthY0);
    if(r1 == r2)//行のバネ
      vFF = mul(this.structK * (len - this.lengthY0), vDir1) ;
    else//列のバネ
      vFF = mul(this.structK * (len - this.lengthX0), vDir1) ;
    this.point[r1+c1*nrp].vForce.add(vFF) ;//vDirと同方向
    this.point[r2+c2*nrp].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVel = sub(this.point[r1+c1*nrp].vVel , this.point[r2+c2*nrp].vVel);
    dampingF = this.damping * dot(vRelativeVel, vDir1);
    this.point[r1+c1*nrp].vForce.sub(mul(dampingF , vDir1));//相対速度とは反対方向
    this.point[r2+c2*nrp].vForce.add(mul(dampingF , vDir1));//同方向
  }

  //せん断バネによる力
  if(this.shearK > 0)
  {
    for(i = 0; i < this.numShear; i++)
    {
      r1 = this.shearS[i].row1; c1 = this.shearS[i].col1;
      r2 = this.shearS[i].row2; c2 = this.shearS[i].col2;
      len = distance(this.point[r1+c1*nrp].vPos, this.point[r2+c2*nrp].vPos);
	  //vDir1 = direction(this.point[r2+c2*nrp].vPos , this.point[r1+c1*nrp].vPos); 
	  vDir1 = direction(this.point[r1+c1*nrp].vPos , this.point[r2+c2*nrp].vPos); 
      vFF = mul(this.shearK * (len - lenShear0), vDir1) ;
      this.point[r1+c1*nrp].vForce.add(vFF) ;//vDirと同方向
      this.point[r2+c2*nrp].vForce.sub(vFF) ;//反対方向
      //減衰力
      vRelativeVel = sub(this.point[r1+c1*nrp].vVel, this.point[r2+c2*nrp].vVel);
      dampingF = this.damping * dot(vRelativeVel, vDir1);
      vFF = mul(dampingF, vDir1);
      this.point[r1+c1*nrp].vForce.sub(vFF);//相対速度とは反対方向
      this.point[r2+c2*nrp].vForce.add(vFF);//同方向
    }
  }


  if(this.hingeK > 0)
  {
    //ヒンｼﾞ（蝶番）バネを考慮
    for(i = 0; i <= this.numRow; i++)
    {
      for(j = 0; j <= this.numCol; j++)
      {
        if(i == 0 && (j == 0 || j == this.numCol)) angle0 = Math.PI / 2;
        else if(i == this.numRow && (j == 0 || j == this.numCol)) angle0 = Math.PI / 2;
        else angle0 = Math.PI;
        
        for(m = 0; m < this.hingeS[i+j*nrp].num; m++)
        {
          if(i == 0 && j == 0) continue;
          if(i == 0 && j == this.numCol-1) continue;
          if(i == this.numRow && j == 0) continue;
          if(i == this.numRow && j == this.numCol) continue;

          r1 = this.hingeS[i+j*nrp].row[2*m];   c1 = this.hingeS[i+j*nrp].col[2*m];
          r2 = this.hingeS[i+j*nrp].row[2*m+1]; c2 = this.hingeS[i+j*nrp].col[2*m+1];
          len1 = distance(this.point[i+j*nrp].vPos, this.point[r1+c1*nrp].vPos);
          len2 = distance(this.point[i+j*nrp].vPos, this.point[r2+c2*nrp].vPos);
          //hingeの中心から隣接質点へ向くベクトル方向
          vDir1 = direction(this.point[i+j*nrp].vPos , this.point[r1+c1*nrp].vPos);
          vDir2 = direction(this.point[i+j*nrp].vPos , this.point[r2+c2*nrp].vPos);
          //２つのベクトルのなす角度
          angle = getAngle_rad(vDir1, vDir2);
          //法線方向
          vNormal = cross(vDir1, vDir2);
          //質点1に作用する力
          vDir1 = cross(vNormal, vDir1);
          vFF = mul(this.hingeK * (angle - angle0) / len1 , vDir1);
          this.point[r1+c1*nrp].vForce.add(vFF) ;//vDirと同方向
          this.point[i+j*nrp].vForce.sub(vFF) ;//注目点では反対方向
          //質点2に作用する力
          vDir2 = cross(vNormal, vDir2);
          vFF = mul(this.hingeK*(angle - angle0)/len2 , vDir2);
          this.point[r2+c2*nrp].vForce.sub(vFF) ;//vDir2の反対方向
          this.point[i+j*nrp].vForce.add(vFF) ;//注目点では反対方向
        }
      }
    }
  }
/*
  if(this.flagCollision)
  {
	//質点どうしの衝突
	var dia = 0.2;
    for(j = 0; j <= this.numCol; j++)
	{
	  for(i = 0; i <= this.numRow; i++)
	  {
		for(J = 0; J <= this.numCol; J++)
		{
	      for(I = 0; I <= this.numRow; I++)
		  {
		    //隣同士は除く
			if(Math.abs(i - I) <= 1 && Math.abs(j - J) <= 1) continue;
			vDir1 = direction(this.point[i+j*nrp].vPos , this.point[I+J*nrp].vPos);//#1から#2への単位ベクトル
			len = distance(this.point[i+j*nrp].vPos, this.point[I+J*nrp].vPos);
			if(len < dia) {
			  vFF = mul( 0.001 / (0.01+len*len), vDir1) ;
			  this.point[i+j*nrp].vForce.sub(vFF) ;//vDirと反対方向
			  this.point[I+J*nrp].vForce.add(vFF) ;//同方向
	        }
		  }
		}
	  }
    }
 
	var vPolePos = new Vector3();//質点と同じ高さのpoleの位置
    //poleと質点
	for(k = 0; k < this.numPole; k++)
	{
	  for(i = 0; i <= this.numRow; i++)
	  {
		for(j = 0; j <= this.numCol; j++) 
		{
	      if(this.point[i+j*nrp].flagFixed == true) continue; //固定

          vPolePos.copy(this.pole[k].vPos);
		  vPolePos.z = this.point[i+j*nrp].vPos.z;//質点と同じ高さのpole位置
		  if(vPolePos.z > this.pole[k].vPos.z + this.pole[k].vSize.z/2.0) continue;
		  if(vPolePos.z < this.pole[k].vPos.z - this.pole[k].vSize.z/2.0) continue;
		  vDir1 = direction(vPolePos , this.point[i+j*nrp].vPos);//単位ベクトル
		  len = distance(vPolePos, this.point[i+j*nrp].vPos);
		  if(len < dia + this.pole[k].vSize.x/2.0)
		  {
		    vFF = mul( 0.005 / (0.0001+len*len) , vDir1) ;
			this.point[i+j*nrp].vForce.add(vFF) ;//vDir1の方向へ
          }
		}
      }
	}
  }
 */
  //粘性抵抗と床面処理
  for(i = 0; i <= this.numRow; i++)
  for(j = 0; j <= this.numCol; j++)
  {
    if(this.point[i+j*nrp].flagFixed) continue; //固定
    //空気粘性抵抗（全ての質点に一様と仮定)
    this.point[i+j*nrp].vForce.sub(mul(this.drag, this.point[i+j*nrp].vVel));
    //床面処理
    if(this.point[i+j*nrp].vPos.z < this.radius)
    {
	  //床面にある質点に対してはすべり摩擦を与える
      this.point[i+j*nrp].vForce.sub(mul(this.muK * this.mass * gravity, norm(this.point[i+j*nrp].vVel)));
      //床面上に制限
      this.point[i+j*nrp].vPos.z = this.radius;
      //床との衝突
      if(this.point[i+j*nrp].vVel.z < 0.0)
      { //質点と床面とは弾性衝突とする
        this.point[i+j*nrp].vVel.z = - this.restitution * this.point[i+j*nrp].vVel.z ;
      }
    }
    //Euler法
    //加速度
    this.point[i+j*nrp].vAcc = div(this.point[i+j*nrp].vForce , this.mass);
    //速度
    this.point[i+j*nrp].vVel.add(mul(this.point[i+j*nrp].vAcc, tt));
    //位置
    this.point[i+j*nrp].vPos.add(mul(this.point[i+j*nrp].vVel, tt));
  }
}



