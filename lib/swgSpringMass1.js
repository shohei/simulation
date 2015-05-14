/*----------------------------------------------
  swgSpringMass1.js
  1次元バネ質点モデル
  弦，ゴムひもなどを表現
-----------------------------------------------*/
var gravity = 9.8;

function SpringMass1()
{
  this.flagCollision = false;//衝突処理有効/無効
  this.numPole = 1;
  this.numSpring = 10;
  this.numPoint = this.numSpring + 1;//11;
  //this.numHinge = 10;
  this.numDummy = 0;//無反射用バネ
  this.mass = 0.1;//質点１個当たりの質量(kg)
  this.constK = 100;//バネ1個当たり
  this.hingeK = 0;//;
  this.damping = 0.1;//0.5;
  this.drag = 0.1;//0.1;
  this.muK = 0.2;
  this.restitution = 0.2;
  this.totalLen0 = 1.0;//全体の自然長
  this.totalLen = 2.0; //全体の長さ（初期値）
  this.length0 = 0.1;  //springの１個当たり自然長
  this.vPos = new Vector3(0, -this.totalLen / 2, 0);
  this.frequency = 1;//強制信号の周波数
  this.amp = 1;//強制信号の振幅

  this.radius = 0.03 ;//1次元弾性体の半径
  this.height0 = 0.8;//初期状態の高さ
	
  this.vForce0 = new Vector3();//外力の初期値
  this.spring = [];
  this.point = [];
  this.pole = [];
  this.motion = "TRANSVERSE";//波の種類、他に "LONGITUDE"
  this.mode = "SINGLE";//他に "CONTINUOUS"
  this.boundary = "B_NON";//他に "B_FREE", "B_FIXED"　
  this.shadow = 0;
 
}
//-----------------------------------------------------------------
SpringMass1.prototype.initialize = function()
{
  this.length0 = this.totalLen0 / this.numSpring;//spring1個当たり
  this.length = this.totalLen / this.numSpring;
  this.numPoint = this.numSpring + 1;
  var i;
  for(i = 0; i < this.numPoint+this.numDummy; i++) this.point[i] = new Rigid();
  for(i = 0; i < this.numSpring+this.numDummy; i++) this.spring[i] = new Rigid();

  //質点のサイズ，位置
  for(i = 0; i < this.numPoint + this.numDummy; i++)
  {
    this.point[i].kind = "SPHERE";
    var dia = 2 * this.radius ;
    if(this.motion == "TRANSVERSE")//横波
      this.point[i].vSize = new Vector3(dia, dia, dia);
    else//縦波
      this.point[i].vSize = new Vector3(2*dia, 0.5*dia, 2*dia);
    this.point[i].vPos = new Vector3(0.0,  i * this.length - this.totalLen/2, this.height0);
    //this.point[i].vPos.add(this.vPos);//全体の平行移動
    this.point[i].vVel = new Vector3();
    this.point[i].nSlice = 6;
    this.point[i].nStack = 6;
	this.point[i].diffuse  = [0.2, 0.9, 0.9, 1.0];
	this.point[i].ambient  = [0.1, 0.5, 0.5, 1.0];
	this.point[i].specular = [0.6, 0.6, 0.6, 1.0];
  }

  //バネのx,y座標(原点に近い質点で定義）と回転角
  //バネに接続する質点番号
  for(i = 0; i < this.numSpring + this.numDummy; i++)
  {
    this.spring[i].kind = "CYLINDER";
    this.spring[i].radiusRatio = 1 ;
    this.spring[i].row1 = i;
    this.spring[i].row2 = i+1;
	this.spring[i].diffuse  = [0.9, 0.9, 0.5, 1.0];
	this.spring[i].ambient  = [0.5, 0.5, 0.2, 1.0];
	this.spring[i].specular = [0.6, 0.6, 0.6, 1.0];
  }
  
  for(i = 0; i < this.numPole; i++)
  {
    this.pole[i] = new Rigid();
    this.pole[i].kind = "CYLINDER";
    this.pole[i].vSize = new Vector3(0.06, 0.06, this.height0);
    this.pole[i].radiusRatio = 1 ;
    this.pole[i].diffuse = [0.8, 0.4, 0.2, 1.0];
    this.pole[i].ambient = [0.4, 0.2, 0.1, 1.0];
	this.pole[i].specular = [0.6, 0.6, 0.6, 1.0];
  }
  if(this.numPole >= 1)
    this.pole[0].vPos = new Vector3(0, -this.totalLen/2, this.height0/2);
  if(this.numPole == 2)
    this.pole[1].vPos = new Vector3(0,  this.totalLen/2, this.height0/2);
 
  //バネ左端位置
  this.vPos = new Vector3(0, -this.totalLen / 2, 0);

}

//-----------------------------------------------------------------
SpringMass1.prototype.draw = function(gl)
{
  var i, r1, r2;

  //ばね質点表示
  //質点
  var n = this.point[0].initVertexBuffers(gl);
  for(i = 0; i < this.numPoint; i++) 
  {
    if(this.point[i].flagFixed == true){
      this.point[i].diffuse = [0.8, 0.2, 0.2, 1.0];
      this.point[i].ambient = [0.4, 0.1, 0.1, 1.0];
    }
    else
    {
	  this.point[i].diffuse  = [0.2, 0.9, 0.9, 1.0];
	  this.point[i].ambient  = [0.1, 0.5, 0.5, 1.0];
    }
    this.point[i].shadow = this.shadow;
    this.point[i].draw(gl, n);
  }

  //バネ
  n = this.spring[0].initVertexBuffers(gl);
  for(i = 0; i < this.numSpring ; i++)
  {
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    this.spring[i].vPos = div(add(this.point[r1].vPos, this.point[r2].vPos), 2);
    var len = distance(this.point[r1].vPos, this.point[r2].vPos);
    this.spring[i].vSize = new Vector3(this.radius, this.radius, len);
    this.spring[i].vEuler = getEulerZ(this.point[r1].vPos, this.point[r2].vPos);
    this.spring[i].shadow = this.shadow;
    this.spring[i].draw(gl, n);
  }
  
  //ポール
  n = this.pole[0].initVertexBuffers(gl);
  for(i = 0; i < this.numPole; i++)
  {
    this.pole[i].shadow = this.shadow;
    this.pole[i].draw(gl, n);
  }
}

//-----------------------------------------------------------------------------
//1次元のバネマスモデル(hinge springも考慮，３次元空間で運動)
SpringMass1.prototype.calcSpringMass1 = function(tt)
{                                           
  var i, j, r1, r2;
  var vDir1 = new Vector3();//hinge中心から#1へ向かう単位方向ベクトル(他にも使用)
  var vDir2 = new Vector3();//hinge中心から#2へ向かう単位方向ベクトル(他にも使用)
  var vFF = new Vector3();
  var vRelativeVel = new Vector3();
  var vNormal = new Vector3();
  var vG = new Vector3(0.0, 0.0, -gravity * this.mass);//重力ベクトル
  var dampingF, len, len1, len2, angle;
  var angle0 = Math.PI;
//console.log("len0 = " + this.length0);
  //力の総和
  //初期設定値（風などの外力）
  for(i = 0; i  < this.numPoint; i++)
    this.point[i].vForce = add(this.vForce0, vG);

  //バネによる力
  for(i = 0; i < this.numSpring; i++)
  {
    //弾性力
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    vDir1 = direction(this.point[r1].vPos , this.point[r2].vPos);//#1から#2への単位ベクトル
    len = distance(this.point[r1].vPos, this.point[r2].vPos);
    vFF = mul(this.constK * (len - this.length0) , vDir1) ;
    this.point[r1].vForce.add(vFF) ;//vDirと同方向
    this.point[r2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVel = sub(this.point[r1].vVel , this.point[r2].vVel);
    dampingF = this.damping * dot(vRelativeVel, vDir1);
    this.point[r1].vForce.sub(mul(dampingF , vDir1));//相対速度とは反対方向
    this.point[r2].vForce.add(mul(dampingF , vDir1));//同方向
  }

  //ヒンｼﾞバネを考慮
  if(this.hingeK > 0)
  {
    for(i = 1; i < this.numSpring; i++)
    {
      len1 = distance(this.point[i].vPos, this.point[i-1].vPos);
      len2 = distance(this.point[i].vPos, this.point[i+1].vPos);
      //hingeの中心から隣接質点へ向くベクトル方向
      vDir1 = direction(this.point[i].vPos , this.point[i-1].vPos);
      vDir2 = direction(this.point[i].vPos , this.point[i+1].vPos);
      //２つのベクトルのなす角度
      angle = getAngle_rad(vDir1, vDir2); //rad単位
      if(angle == angle0) continue;
      //法線方向
      vNormal = cross(vDir1, vDir2);
      vDir1 = cross(vDir1, vNormal); //質点1に作用する力の方向
      vFF = mul(this.hingeK * (angle0 - angle)/len1 , vDir1);
      this.point[i-1].vForce.add(vFF) ;//vDir1と同方向
      this.point[i].vForce.sub(vFF);
      vDir2 = cross(vNormal, vDir2);//質点2に作用する力の方向
      vFF = mul(this.hingeK * (angle0 - angle)/len2, vDir2);
      this.point[i+1].vForce.add(vFF) ;//vDir2の方向
      this.point[i].vForce.sub(vFF);
    }
  }

  if(this.flagCollision)
  {
//console.log("QQQQQQQQQQQQQQQ");
	//質点同士の衝突防止のため斥力を与える
	var m1, m2;
	for(m1 = 0; m1 < this.numPoint-1; m1++)
    {
	  //for(m2 = m1+2; m2 < this.numPoint; m2++)
	  for(m2 = 0; m2 < this.numPoint; m2++)
      {
        if(m2 >= m1-1 && m2 <= m1+1) continue;
	    vDir1 = direction(this.point[m1].vPos , this.point[m2].vPos);//#1から#2への単位ベクトル
		len = distance(this.point[m1].vPos, this.point[m2].vPos);
		if(len < this.radius + this.length0 ) {
		  vFF = mul(( 0.01 / (0.01+len*len) ), vDir1)  ;
//console.log("y = " + vFF.y + " z = " + vFF.z);
		  vFF.x += getRandom(-0.1, 0.1);
//console.log("y = " + vFF.y + " x = " + vFF.x);
		  this.point[m1].vForce.sub(vFF) ;//vDirと反対方向
		  this.point[m2].vForce.add(vFF) ;//同方向
		}
	  }
	}

	var vPolePos = new Vector3();//質点と同じ高さのpoleの位置

	//poleと質点の衝突防止のため斥力を与える
	for(j = 0; j < this.numPole; j++)
	{
	  for(i = 0; i < this.numPoint; i++)
      {
	    if(this.point[i].flagFixed) continue; //固定
		vPolePos.copy(this.pole[j].vPos);
		vPolePos.z = this.point[i].vPos.z;//質点と同じ高さのpole位置
		if(vPolePos.z > this.pole[j].vPos.z + this.pole[j].vSize.z/2.0) continue;//poleの上では遮らない
		if(vPolePos.z < this.pole[j].vPos.z - this.pole[j].vSize.z/2.0) continue;//poleの下も
		vDir1 = direction(vPolePos , this.point[i].vPos);//単位ベクトル
		len = distance(vPolePos, this.point[i].vPos);
		if(len < this.radius + this.pole[j].vSize.x/2)
		{
		  //vFF = mul(0.5 / (0.0001+len*len), vDir1) ;
		  vFF = mul(0.01 / (0.01+len*len), vDir1) ;
		  vFF.x += getRandom(-0.1, 0.1);
		  this.point[i].vForce.add(vFF) ;//vDir1の方向へ
		}
	  }
	}

    //poleとバネの衝突防止のため斥力を与える
	for(j = 0; j < this.numPole; j++)
	{
	  for(i = 0; i < this.numSpring; i++)
      {
	    if(this.point[i].flagFixed) continue; //固定
	    vPolePos.copy(this.pole[j].vPos);
	    vPolePos.z = this.spring[i].vPos.z;//バネと同じ高さのpole[j]位置
	    if(vPolePos.z > this.pole[j].vPos.z + this.pole[j].vSize.z/2.0) continue;//pole[j]の上では遮らない
	    if(vPolePos.z < this.pole[j].vPos.z - this.pole[j].vSize.z/2.0) continue;//poleの下も
	    vDir1 = direction(vPolePos , this.spring[i].vPos);//単位ベクトル
	    len = distance(vPolePos, this.spring[i].vPos);
	    if(len < this.radius + this.pole[j].vSize.x/2)
	    {
		  vFF = mul( 0.01 / (0.01+len*len) , vDir1) ;
		  vFF.x += getRandom(-0.1, 0.1);
		  r1 = this.spring[i].row1;
	      r2 = this.spring[i].row2;
	      this.point[r1].vForce.add(vFF) ;//vDir1の方向へ
	      this.point[r2].vForce.add(vFF) ;//vDir1の方向へ
	    }
	  }
	}
  }

  //粘性抵抗と床面処理
  for(i = 0; i < this.numPoint; i++)
  {
    if(this.point[i].flagFixed) continue; //固定
    //空気粘性抵抗（全ての質点に一様と仮定)
    this.point[i].vForce.sub(mul(this.drag, this.point[i].vVel));
    //床面処理
    if(this.point[i].vPos.z < this.radius)
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
}

//-----------------------------------------------------------------------------

//横波
SpringMass1.prototype.testTransverseWave = function(tt)
{                                                
  var i, r1, r2;
  var damping, len;
  var vDir1, vDir2, vFF;
  var vRelativeVelocity;
  var vNormal;
  var dragA = this.drag;
  var dragMax = 1.0;

  //初期設定値
  for(i = 0; i  < this.numPoint + this.numDummy; i++)
    this.point[i].vForce = new Vector3();//無重力

  //バネによる力
  for(i = 0; i < this.numSpring + this.numDummy; i++)
  {
    //弾性力
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    vDir1 = direction(this.point[r1].vPos , this.point[r2].vPos);//#1から#2への単位ベクトル
    len = distance(this.point[r1].vPos, this.point[r2].vPos);
    vFF = mul(this.constK * (len - this.length0), vDir1);
    this.point[r1].vForce.add(vFF) ;//vDirと同方向
    this.point[r2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVelocity = sub(this.point[r1].vVel, this.point[r2].vVel);
    dampingF = this.damping * dot(vRelativeVelocity, vDir1);
    vFF = mul(dampingF, vDir1);
    this.point[r1].vForce.sub(vFF);//相対速度とは反対方向
    this.point[r2].vForce.add(vFF);//同方向
  }

  //の速度と位置の更新
  for(i = 0; i < this.numPoint + this.numDummy; i++)
  {
    if(this.point[i].flagFixed == true) continue; //固定
    if(this.boundary == "B_NON")//無反射境界条件
	{
	  if(i >= this.numPoint+1) dragA = this.drag + dragMax * (i - this.numPoint) / this.numDummy;
	}
    //空気粘性抵抗（全ての質点に一様と仮定)
    // this.point[i].vForce.z -= dragA * this.point[i].vVel.z;
    this.point[i].vForce.sub(mul(dragA , this.point[i].vVel));

    //Euler法
    //加速度(xy座標を固定）
    this.point[i].vAcc.z = this.point[i].vForce.z / this.mass;
    //速度
    this.point[i].vVel.z += this.point[i].vAcc.z * tt;
    //位置
    this.point[i].vPos.z += this.point[i].vVel.z * tt;
  }
}

//縦波
SpringMass1.prototype.testLongitudinalWave = function(tt)
{                                                
  var i, r1, r2;
  var vDir1;//hinge中心から#1へ向かう単位方向ベクトル(他にも使用)
  var vDir2;//hinge中心から#2へ向かう単位方向ベクトル(他にも使用)
  var vFF;
  var vRelativeVelocity;
  var dampingF, len;
  var vNormal;
  var dragA = this.drag;
  var dragMax = 1;

  //力の総和
  //初期設定値
  for(i = 0; i  < this.numPoint + this.numDummy; i++)
    this.point[i].vForce = new Vector3();//無重力

  //バネによる力
  for(i = 0; i < this.numSpring + this.numDummy; i++)
  {
    //弾性力
    r1 = this.spring[i].row1;
    r2 = this.spring[i].row2;
    vDir1 = direction(this.point[r1].vPos, this.point[r2].vPos);//#1から#2への単位ベクトル
    len = distance(this.point[r1].vPos, this.point[r2].vPos);
    vFF = mul(this.constK * (len - this.length0), vDir1) ;
    this.point[r1].vForce.add(vFF) ;//vDirと同方向
    this.point[r2].vForce.sub(vFF) ;//反対方向
    //減衰力
    vRelativeVelocity = sub(this.point[r1].vVel, this.point[r2].vVel);
    dampingF = this.damping * dot(vRelativeVelocity, vDir1);
    vFF = mul(dampingF, vDir1);
    this.point[r1].vForce.sub(vFF);//相対速度とは反対方向
    this.point[r2].vForce.add(vFF);//同方向
  }

  //速度と位置の更新
  for(i = 0; i < this.numPoint + this.numDummy; i++)
  {
    if(this.point[i].flagFixed == true) continue; //固定
    if(this.boundary == "B_NON")
	{
//	  if(i >= this.numPoint+1) dragA = this.drag + (i - this.numPoint);
	  if(i >= this.numPoint+1) dragA = this.drag + dragMax * (i - this.numPoint) / this.numDummy;
	  else dragA = this.drag;
	}

    //空気粘性抵抗（全ての質点に一様と仮定)
    this.point[i].vForce.sub(mul(dragA, this.point[i].vVel));

    //Euler法
    //加速度（y軸方向だけの振動）
    this.point[i].vAcc.y = this.point[i].vForce.y / this.mass;
    //速度
    this.point[i].vVel.y += this.point[i].vAcc.y * tt;
    //位置
    this.point[i].vPos.y += this.point[i].vVel.y * tt;
  }
}

