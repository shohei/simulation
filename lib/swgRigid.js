/*----------------------------------------------------------
   Rigidクラス（3Dオブジェクトの定義と描画）
------------------------------------------------------------*/
var MAX_VERTEX = 30;//多面体近似のときの頂点数
var muK = 1.0;//0.5;//動摩擦係数
var muS = 1.0;//静止摩擦係数
var restitution = 0.5;//跳ね返り係数
var dampRotation = 3.0;//回転減速係数
var gravity = 9.8;//重力加速度[m/s^2] 
var restValue = 0.2; //静止状態にするしきい値（速度，回転速度）
var flagDrag = false;//空気抵抗フラグ
var flagMagnus = false;
var flagTumbling = false;
var flagQuaternion = false;

function Rigid()
{
  //プロパティ
  this.kind = "SPHERE";
  this.diffuse = [0.6, 0.6, 0.6, 1.0];
  this.ambient = [0.4, 0.4, 0.4, 1.0];
  this.specular = [0.5, 0.5, 0.5, 1.0];
  this.shininess = 200.0; 
  this.vVel = new Vector3();//速度(m/s) 
  this.vVel0 = new Vector3();//更新前の速度
  this.vPos = new Vector3();//位置(m)
  this.vPos0 = new Vector3();//初期位置
  this.vForce = new Vector3();//外力（Newton)
  this.vForce0 = new Vector3();//外力（初期値)
  this.vOmega = new Vector3();//角速度(rad/s)
  this.vOmega0 = new Vector3();//角速度(rad/s),更新前  
  this.vAcc = new Vector3();//加速度
  this.vTorque = new Vector3();//トルク
  this.vEuler0 = new Vector3();//回転角度（オイラー角で指定,更新前）
  this.vEuler = new Vector3();//回転角度（オイラー角で指定,更新後）
  this.vSize = new Vector3(1.0, 1.0, 1.0);//スケーリング
  this.vGravityToPoint = new Vector3();//重心から衝突点までのベクトル
  this.mass = 1;//質量[kg]
  this.mInertia = new Matrix3();//慣性モーメントのテンソル
  this.mInertiaInverse = new Matrix3();//その逆行列
  this.vInertialResistance = new Vector3();
  this.vRotationalResistance = new Vector3();
  
  this.q = new Quaternion();
  this.vAxis = new Vector3(1.0, 0.0, 0.0);//回転軸
  this.angle = 0.0;
  this.nSlice = 25;
  this.nStack = 25; 
  this.radiusRatio = 0.2;//上底半径/下底半径（トーラスとバネの時はradius1/radius2)
  this.eps1 = 1.0;//"SUPER"のパラメータ
  this.eps2 = 1.0;//"SUPER"のパラメータ
  this.flagDebug = false;//trueのときワイヤーフレームモデル
  this.shadow = 0.0;//影の濃さを表す（0.0なら実オブジェクト)
  //フロア表示のチェック模様
  this.flagCheck = false;
  this.col1 = [0.6, 0.5, 0.5, 1.0];
  this.col2 = [0.4, 0.4, 0.6, 1.0];
  this.plane = [0, 0, 1, 0];//簡易シャドウを描くときの平面の平面方程式
  //テクスチャ
  this.flagTexture = false;
  this.nRepeatS = 1;
  this.nRepeatT = 1;
  //衝突判定などに使われるプロパティ
　this.vP = [];
  this.vP0 = [];//球以外の頂点座標
  this.vNormal = new Vector3();
  this.vNormalFacet = [];//直方体の面の法線ベクトル
  this.numVertex;//球以外の多面体の頂点数
  this.boundingR;//境界球の半径
  this.state = "FREE";
  this.flagFixed = false;
  //tumbling特有のプロパティ
  this.coefLift = 1.0;//揚力係数
  this.delta = 0.5;//シフト率
  //Spring特有のプロパティ
  this.nPitch = 5;//バネ
  this.radius = 0.5;//バネはvSizeを使用しない
  this.len0 = 1;//バネの自然長
  this.len = 1;//length0+変位量  
  this.constant;//バネ定数
  this.row = [];
  this.col = [];
  //水面の波などの表現
  this.sizeX = 10;
  this.sizeY = 10;
  this.data = [];//各格子点のx,y,z座標(kind = "GRID_SQUARE"などのときに必要なデータ)
                 //kind = "ELEVATION"のときはｚ成分だけ
  //SUPER2のパラメータ
  this.size1 = [0.5, 0.1, 0.5];  
  this.size2 = [0.5, 0.1, 0.5];   
  this.middle = 0.5; //中間のサイズ
  this.angle2 = 0;//曲げる角度（度）
  this.jStart = 5;
  this.type = 1;//0,1,2だけ               
}

Rigid.prototype.initVertexBuffers = function(gl)
{
  //頂点データをシェーダへアップロードするメソッド
  var n;
  var vertices = [];//頂点座標
  var normals = []; //法線ベクトル
  var indices = []; //頂点番号
  var colors = [];//check模様のときだけ
  var texCoords = [];//テクスチャ座標

  if(!this.flagTexture)
  {//非テクスチャ用
    if     (this.kind == "CUBE")    n = makeCube(vertices, normals, indices, this.flagDebug);
    else if(this.kind == "SPHERE")  n = makeSphere(vertices, normals, indices, this.nSlice, this.nStack);
    else if(this.kind == "CYLINDER")n = makeCylinder(vertices, normals, indices, this.radiusRatio, this.nSlice, this.flagDebug);
    else if(this.kind == "PRISM")   n = makePrism(vertices, normals, indices, this.radiusRatio, this.nSlice, this.flagDebug);
    else if(this.kind == "TORUS")   n = makeTorus(vertices, normals, indices, this.radiusRatio, this.nSlice, this.nStack);
    else if(this.kind == "SUPER")   n = makeSuper(vertices, normals, indices, this.nSlice, this.nStack, this.eps1, this.eps2);
    else if(this.kind == "SUPER2")   n = makeSuper2(vertices, normals, indices, this.size1, this.size2, this.nSlice, this.nStack, this.eps1, this.eps2, this.middle, this.angle2, this.jStart, this.type);
    else if(this.kind == "SPRING")   n = makeSpring(vertices, normals, indices, this.radius, this.radiusRatio, this.nSlice, this.nStack, this.nPitch, this.len);
    else if(this.kind == "CYLINDER_X") n = makeCylinderX(vertices, normals, indices, this.nSlice, this.flagDebug);
    else if(this.kind == "CYLINDER_Y") n = makeCylinderY(vertices, normals, indices, this.nSlice, this.flagDebug);
    else if(this.kind == "CYLINDER_Z") n = makeCylinderZ(vertices, normals, indices, this.nSlice, this.flagDebug);
    else if(this.kind == "PLATE_Z")    n = makePlateZ(vertices, normals, indices, this.flagDebug);
    else if(this.kind == "GRID_PLATE") n = makeGridPlate(vertices, normals, indices, this.nSlice, this.nStack, this.flagDebug);
    else if(this.kind == "GRID_SQUARE") n = makeGridSquare(this.data, vertices, normals, indices, this.nSlice, this.nStack, this.flagDebug);
    else if(this.kind == "ELEVATION") n = makeElevation(this.data, vertices, normals, indices, this.nSlice, this.nStack, this.sizeX, this.sizeY, this.flagDebug)
    else if(this.kind == "CHECK_PLATE") n = makeCheckedPlate(vertices, colors, normals, indices, this.nSlice, this.nStack, this.col1, this.col2) ;  
    else if(this.kind == "CHECK_SQUARE") n = makeCheckedSquare(this.data, vertices, colors, normals, indices, this.nSlice, this.nStack, this.col1, this.col2) ;  
    else if(this.kind == "GRID_SPHERE") n = makeGridSphere(this.data, vertices, normals, indices, this.nSlice, this.nStack);
    else if(this.kind == "CHECK_SPHERE") n = makeCheckedSphere(this.data, vertices, colors, normals, indices, this.nSlice, this.nStack, this.col1, this.col2);
    else if(this.kind == "GRID_CYLINDER") n = makeGridCylinder(this.data, vertices, normals, indices, this.nSlice, this.nStack);
    else if(this.kind == "CHECK_CYLINDER") n = makeCheckedCylinder(this.data, vertices, colors, normals, indices, this.nSlice, this.nStack, this.col1, this.col2);
  }
  else
  {//テクスチャ用
    if     (this.kind == "CUBE")    n = makeCubeTex(vertices, texCoords, normals, indices, this.flagDebug, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "CUBE_BUMP") n = makeCubeBump(vertices, texCoords, normals, indices, this.flagDebug, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "SPHERE")  n = makeSphereTex(vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "CYLINDER")n =  makeCylinderTex(vertices, texCoords, normals, indices, this.radiusRatio, this.nSlice, this.flagDebug, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "PRISM")   n = makePrismTex(vertices, texCoords, normals, indices, this.radiusRatio, this.nSlice, this.flagDebug, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "TORUS")   n = makeTorusTex(vertices, texCoords, normals, indices, this.radiusRatio, this.nSlice, this.nStack, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "SUPER")   n = makeSuperTex(vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.eps1, this.eps2, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "PLATE_Z") n = makePlateZTex(vertices, texCoords, normals, indices, this.flagDebug, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "GRID_PLATE") n = makeGridPlateTex(vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.flagDebug, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "GRID_SQUARE") n = makeGridSquareTex(this.data, vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.flagDebug, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "GRID_SPHERE") n = makeGridSphereTex(this.data, vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "GRID_CYLINDER") n = makeGridCylinderTex(this.data, vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.nRepeatS, this.nRepeatT);
  }
  gl.disableVertexAttribArray(colorLoc);//colorのバッファオブジェクトの割り当てを無効化（フロアを表示したとき，フロアのインデックス以上の球やトーラスを描画できなくなることを防ぐため）

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  if(this.flagTexture) {var texCoordBuffer = gl.createBuffer();}
  var normalBuffer = gl.createBuffer();
  if(this.flagCheck) var colorBuffer = gl.createBuffer();
  var indexBuffer = gl.createBuffer();
  if (!vertexBuffer || !normalBuffer || !indexBuffer) return -1;
  
  // 頂点の座標をバッファ・オブジェクトに書き込む
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(vertices), gl.STATIC_DRAW);
  // vertexLocにバッファ・オブジェクトを割り当てる
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);
  // バッファ・オブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.enableVertexAttribArray(vertexLoc);//有効化する

  if(this.flagTexture)
  {
    // 頂点のテクスチャ座標をバッファオブジェクトに書き込む
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(texCoords), gl.STATIC_DRAW);
    // texLocにバッファオブジェクトを割り当てる
    var texLoc = gl.getAttribLocation(gl.program, 'a_texCoord');
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    // バッファオブジェクトのバインドを解除する
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(texLoc);//有効化する
  }

  if(this.flagCheck)
  {
    // 頂点の色をバッファ・オブジェクトに書き込む
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    // a_colorの格納場所を取得し、バッファオブジェクトを割り当てる
    var colorLoc = gl.getAttribLocation(gl.program, 'a_color');
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    // バッファ・オブジェクトのバインドを解除する
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.enableVertexAttribArray(colorLoc);//有効化
  }

  // 法線データをバッファ・オブジェクトに書き込む
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(normals), gl.STATIC_DRAW);
  // normalLocにバッファ・オブジェクトを割り当てる
  var normalLoc = gl.getAttribLocation(gl.program, 'a_normal');
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.enableVertexAttribArray(normalLoc);//有効化する

  //バッファ・オブジェクトをターゲットにバインドする
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  // インデックスデータをバッファ・オブジェクトに書き込む
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);


  return n;
}

Rigid.prototype.draw = function(gl, n)
{
  //マテリアル特性のユニフォーム変数格納場所を取得し値を設定する
  var diffLoc = gl.getUniformLocation(gl.program, 'u_diffuseColor');
  gl.uniform4fv(diffLoc, new Float32Array(this.diffuse));
  var ambiLoc = gl.getUniformLocation(gl.program, 'u_ambientColor');
  gl.uniform4fv(ambiLoc, new Float32Array(this.ambient));
  var specLoc = gl.getUniformLocation(gl.program, 'u_specularColor');
  gl.uniform4fv(specLoc, new Float32Array(this.specular));
  var shinLoc = gl.getUniformLocation(gl.program, 'u_shininess');
  gl.uniform1f(shinLoc, this.shininess);
　var checkLoc = gl.getUniformLocation(gl.program, 'u_flagCheck');
　gl.uniform1i(checkLoc, this.flagCheck);
  var shadowLoc = gl.getUniformLocation(gl.program, 'u_shadow');
  gl.uniform1f(shadowLoc, this.shadow);
  var flagTexLoc = gl.getUniformLocation(gl.program, 'u_flagTexture');
  gl.uniform1i(flagTexLoc, this.flagTexture);

  // モデル行列を計算する
  var modelMatrix = new Matrix4(); // モデル行列の初期化
  if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ
  modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
  //回転
  if(flagQuaternion)
  {
    if(this.q.s > 1.0) this.q.s = 1.0;
    if(this.q.s < -1.0) this.q.s = -1.0;
    this.angle = 2.0 * Math.acos(this.q.s) * RAD_TO_DEG;//[rad->deg]
    this.vAxis = norm(getVector(this.q));
    if(this.vAxis.x == 0 && this.vAxis.y == 0 && this.vAxis.z == 0) {
      this.vAxis.x = 1;
    }
    modelMatrix.rotate(this.angle, this.vAxis.x, this.vAxis.y, this.vAxis.z); //任意軸回転
  }
  else
  {//xyz軸の順番でオイラー角回転
    modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
    modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
    modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
  }
  //拡大縮小
  modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);

  //法線変換行列を計算する
  var normalMatrix = new Matrix4();// 初期化
  if(this.shadow < 0.01)//影でないときだけ
  {
    normalMatrix.setInverseOf(modelMatrix);//モデルリング行列の逆行列を求め
    normalMatrix.transpose();              //さらに転置する
  }
  //それぞれの行列のuniform変数の格納場所を取得し値を設定する
  var modelMatrixLoc = gl.getUniformLocation(gl.program, 'u_modelMatrix');
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix.elements);
  var normalMatrixLoc = gl.getUniformLocation(gl.program, 'u_normalMatrix');
  gl.uniformMatrix4fv(normalMatrixLoc, false, normalMatrix.elements);
  //物体を描画する
  if(this.flagDebug == false)//solidモデルで描画
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
  else//wireframeモデルで描画
  {
    if(this.kind == "GRID_SQUARE" || this.kind == "CHECK_SQUARE" || this.kind == "ELEVATION")
      gl.drawElements(gl.LINES, n, gl.UNSIGNED_SHORT, 0);
    else
      gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_SHORT, 0);
  }
}

//---------------------------------------------------------
Rigid.prototype.ready = function()
{
  this.state = "FREE";
  for(var i = 0; i < MAX_VERTEX; i++){
    this.vP0[i] = new Vector3();
    this.vP[i] = new Vector3();
    this.vNormalFacet[i] = new Vector3();
  }
  this.calcMomentOfInertia();
  this.calcInertialResistance();
  this.calcRotationalResistance();
  this.calcBoundingRadius();
  if(this.kind == "CUBE") this.setVertexOfCube();
  else if(this.kind == "CYLINDER") this.setVertexOfCylinder();
}

//----------------------------------------------------------------------------
Rigid.prototype.sphere2D = function()
{
  var R = this.vSize.x / 2.0;
  //接触面の法線方向（rigid側から見た方向）
  var vNormal = new Vector3(0.0, 0.0, -1.0);
  //重心から接触点へのベクトル
  this.vGravityToPoint = new Vector3(0.0, 0.0, -this.vPos.z);
  //回転による接触面の速度（vVelとは逆方向）
  var vVelRotate = cross(this.vOmega , this.vGravityToPoint);
  //接地点の合成速度
  var vp = add(this.vVel, vVelRotate); //接地点速度
  var vAxisRotate = cross(vp, vNormal);//回転軸
  vAxisRotate.norm();
  var a = this.mass * muK * gravity;
  //線形速度の減速/加速
  this.vForce.sub(mul(a, norm(vp)));
  //回転速度の加速/減速
  this.vTorque.add(mul(a * R, vAxisRotate));
  //滑らずに転がる場合でもある程度減速 
  this.vForce.sub(mul(0.1*a, norm(this.vVel)));
  //鉛直軸回転に対する減速
  this.vTorque.z -= 0.1 * dampRotation * this.mass * muK * (norm(this.vOmega)).z;
}

//-----------------------------------------------------------------------------
Rigid.prototype.cylinder2D = function()
{
  var eps = 0.0174;//1度以内
  //円柱の中心軸(ｵﾌﾞｼﾞｪｸﾄ座標のz軸）方向
  var vCenter = new Vector3(0, 0, 1);
  vCenter = qvRotate(this.q, vCenter);
  //中心軸方向をrigidの速度方向に揃える
  if(dot(this.vVel, vCenter) < 0.0) vCenter.reverse();
  var e0 = Math.abs(dot(vCenter , new Vector3(0.0, 0.0, 1.0)));
  
  if( e0 < eps && Math.abs(this.vOmega.z) < 0.5)
  {//中心軸が床面に水平で慣性軸のz軸回転が小さいとき
    var R = this.vSize.x / 2.0;//円柱の半径
    //rigid側から見た接触面の法線方向
	var vNormal = new Vector3(0.0, 0.0, -1.0);
	this.vGravityToPoint = new Vector3(0.0, 0.0, -this.vPos.z);
	var vDir = cross(vCenter, vNormal);//中心軸に直交する水平方向
	//中心軸に直交する方向および平行な方向の速度成分
	var vVelV = mul(dot(this.vVel, vDir), vDir);
	var vVelH = mul(dot(this.vVel, vCenter), vCenter);
    if(mag(vVelH) < 3.0)
	{//中心軸に平行な速度がある値以下になったとき転がり運動に移行
	  this.vVel = vVelV;
      //回転による接触面の速度
	  var vVelRotate = cross(this.vOmega, this.vGravityToPoint);			
	  var vp = add(vVelV, vVelRotate);//接地点合成速度
	  var vAxisRotate = cross(vp, vNormal);//回転軸
	  vAxisRotate.norm();//正規化
      var a = this.mass * muK * gravity;
      //線形速度の減速/加速
	  this.vForce.sub(mul(a , norm(vp)));
      //回転速度の加速/減速
	  this.vTorque.add(mul(a * R, vAxisRotate));
      //滑らずに転がる場合でもある程度減速 
      this.vForce.sub(mul(0.1 * a, norm(this.vVel)));
	}
	else //滑り運動に対する減速だけ
	  this.vForce.add(mul(this.mass * muK * gravity , reverse(norm(this.vVel))));
  }
  else
  {//中心軸が床面に水平でない場合．水平でも鉛直軸回転が大きい場合
	this.vForce.add(mul(this.mass * muK * gravity, reverse(norm(this.vVel))));
  }
  //鉛直軸回転に対する減速
  this.vTorque.z -= dampRotation * this.mass * muK * (norm(this.vOmega)).z;
}

//----------------------------------------------------------
Rigid.prototype.action3D = function(dt)
{	
  //フロア（地面）に落下するまでは放物運動をおこなう
  this.vForce = add(this.vForce0, new Vector3(0.0, 0.0, -this.mass * gravity));
  this.vTorque = new Vector3() ;
  var bottom = this.getBottom();//最低点およびvGravityToPointも取得
  if(bottom < 0.0) this.vPos.z -= bottom;//沈み込み防止

  if(this.state != "FREE" ) return;

  if(flagTumbling) this.tumbling();

  if(flagDrag)
  {
    //並進運動に対する慣性抵抗
    this.vForce.sub(mul(Math.abs(dot(qvRotate(this.q, this.vInertialResistance), this.vVel)) , this.vVel)) ;
    //回転運動に対する慣性抵抗
	this.vTorque.sub(mul(Math.abs(dot(qvRotate(this.q, this.vRotationalResistance), this.vOmega)) , this.vOmega));
  }

  if(flagMagnus)
  {
    var r = this.vSize.x / 2.0;
	var k = Math.PI * 1.2 * r * r * r * 0.001;//rは見かけのサイズの1/10
	this.vForce.add(mul(k, cross(this.vOmega, this.vVel)));
  }
  
  var flagCollisionF = false;
  if(bottom <= 0 && this.vVel.z <= 0 ) //フロア上または衝突
  {
    if(this.vVel.z < -0.3)//vzが負の大きな値のとき衝突とする 
    { 
      this.collisionWithFloor(dt); 
      flagCollisionF = true; 
    }

    if(!flagCollisionF)
    {
      this.state = "FREE";
	  //重力と抗力によるトルク
	  if(this.kind == "CUBE" || this.kind == "CYLINDER")
	  {
	    var torq = mul(cross(this.vGravityToPoint, new Vector3(0.0, 0.0, this.mass * gravity)), 0.5);
	    this.vTorque.add(torq);
	  }
      //床平面上の2次元運動
	  if(this.kind == "SPHERE") this.sphere2D();
	  else if(this.kind == "CYLINDER") this.cylinder2D();
	  else
	  {//直方体
	    var vDir = normXY(this.vVel);//z成分を無視
        this.vForce.sub(mul(this.mass * muK * gravity, vDir));
        //床面におけるｚ軸回転に対し逆方向のトルクを与える
        this.vTorque.z -= dampRotation * this.mass * muK * (norm(this.vOmega)).z;
	  }

      if(this.isStabilized())
	  {
	    if(mag(this.vVel) + this.boundingR * mag(this.vOmega) < restValue) 
	    {//静止状態にする
          this.state = "RESTING";
        }
	  }
    }
  }

  if(this.state == "RESTING")
  {//静止状態にする
    this.vVel = new Vector3();
    this.vTorque = new Vector3();
    this.vOmega = new Vector3();
  }
 
  //並進運動の速度・位置の更新
  var vAcc = div(this.vForce , this.mass);
  this.vVel.add(mul(vAcc , dt));
  this.vPos.add(mul(this.vVel , dt));
　//回転運動の角速度・クォータニオンの更新
  //オブジェクト座標系に変換しEulerの運動方程式を適用
  var vOmegaObj = qvRotate(conjugate(this.q), this.vOmega);
  var vTorqueObj = qvRotate(conjugate(this.q), this.vTorque);
  var cs = cross(vOmegaObj, mulMV(this.mInertia, vOmegaObj));
  //角加速度（オブジェクト座標系）
  var vAlpha = mulMV(this.mInertiaInverse, sub(vTorqueObj, cs));
  //角加速度を慣性座標系にもどし角速度を更新
  this.vOmega.add(qvRotate(this.q, mul(vAlpha, dt)));
  var qq = mulVQ(this.vOmega, this.q); 
  this.q.add(mulQS(qq, (0.5 * dt)));
  this.q.norm();
}

//-------------------------------------------------------------------------
//Floorとの衝突を調べFloorから最低位置の高さを返す
Rigid.prototype.getBottom = function()
{
  var bottom, i, cnt;
  var eps = 0.0;//0.1;
  var vCollision = [];//衝突点の頂点番号(多面体)
  for(i = 0; i < 30; i++) vCollision[i] = new Vector3();
  var vPointCollision = new Vector3();
  bottom = 1000.0;
  if( this.vPos.z <= this.boundingR + eps)
  {//床と衝突の可能性あり
    if(this.kind == "SPHERE")
    {
      bottom = this.vPos.z - this.boundingR;
      this.vGravityToPoint = new Vector3(0, 0, -this.boundingR);

      return bottom;
    }
    else
    {
	  //World座標に変換
      for(i = 0; i < this.numVertex; i++)
      {
        this.vP[i] = qvRotate(this.q, this.vP0[i]);//慣性空間へ変換
        //中心座標だけ平行移動
        this.vP[i].add(this.vPos);//World座標
      }
      cnt = 0;//衝突点個数
      vPointCollision = new Vector3();
      for(i = 0 ; i < this.numVertex; i++) {
        if(this.vP[i].z <= 0) { vPointCollision.add(this.vP[i]); cnt++; }
        if(this.vP[i].z < bottom )  bottom = this.vP[i].z;
      }
      if(bottom <= eps)  //Floorと衝突
      {
        vPointCollision.div(cnt);
        this.vGravityToPoint = sub(vPointCollision, this.vPos);
        return bottom;
      }
    }
  }
  return bottom;
}
//--------------------------------------------------------------
Rigid.prototype.collisionWithFloor = function(dt)
{
  var c = 0.2;
  var vNormal = new Vector3(0.0, 0.0, -1.0);//衝突面の法線方向(rigid側からの法線）	
  //衝突点の合成速度
  var vp = add(this.vVel, cross(this.vOmega, this.vGravityToPoint));//衝突点速度(ベクトル）
  var vTangent = cross(vNormal, cross(vp, vNormal)); //接線ベクトル
  vTangent.norm();
	
  var a1 = cross(this.vGravityToPoint, vNormal);
  var a2 = mulMV(this.mInertiaInverse, a1);
  var a3 = cross(a2, this.vGravityToPoint);
  //力積
  var rikiseki = - (restitution + 1.0) * dot(vNormal, vp) / (1.0/this.mass + dot(vNormal, a3));

  //摩擦なし
  //力の総和
  this.vForce.add(mul(vNormal, rikiseki / dt));
  //力のモーメント（トルク）の総和
  this.vTorque.add(mul(cross(this.vGravityToPoint, vNormal), c*rikiseki / dt));

  //摩擦を考慮した分を追加
  var c2 = dot(vTangent, cross(mulMV(this.mInertiaInverse, cross(this.vGravityToPoint, vTangent)), this.vGravityToPoint));
  var B = -dot(vTangent, vp) / (1.0/this.mass + c2);
  var muC = Math.abs(B / rikiseki);
  if(muK >= muC){
    this.vForce.add(mul(B/dt, vTangent));
    this.vTorque.add(mul(cross(this.vGravityToPoint, vTangent), c* B/dt));
  }
  else
  {
    this.vForce.add( mul(muK * rikiseki / dt , vTangent));
	this.vTorque.add(mul(cross(this.vGravityToPoint, vTangent) , c*muK * rikiseki / dt));
  }
}

//--------------------------------------------------------------
Rigid.prototype.isStabilized = function()
{
  //安定な姿勢とは，
  //直方体：P0-P1とP1-P2の両方が水平であるか，どちらかが水平面に垂直
  //円柱：中心軸が水平面に直角または平行
  
  var e0, e1;
  var eps0 = 0.0174;//cos89  0.08715;//cos8   
  var eps1 =  0.9998;//cos1  0.99619;//cos5    
  var vNormal = new Vector3(0, 0, 1);

  if(this.kind == "SPHERE") return true;

  else if(this.kind == "CUBE")
  {
    e0 = norm(qvRotate(this.q, direction(this.vP0[4], this.vP0[0])));//慣性座標に変換
    e0 = Math.abs(dot(e0, vNormal));
	e1 = norm(qvRotate(this.q, direction(this.vP0[0], this.vP0[1])));
    e1 = Math.abs(dot(e1, vNormal));
	//どちらかが鉛直なら安定
	if( e0 > eps1 ) return true;
	if( e1 > eps1 ) return true;
	if( e0 < eps0 && e1 < eps0) return true;//どちらも水平
 
  }

  else if(this.kind == "CYLINDER")
  {
    e0 = norm(qvRotate(this.q, direction(this.vP0[2*this.nSlice], this.vP0[2*this.nSlice+1])));//中心軸(基本姿勢のz軸)
    e0 = Math.abs(dot(e0, vNormal));

    if( e0 > eps1) return true;//z軸に平行（垂直）
    if( e0 < eps0) return true;//フロアに平行
  }
  return false;
}

//------------------------------------------------------------------------------
Rigid.prototype.calcMomentOfInertia = function()
{ 
  if(this.kind != "SPHERE" && this.kind != "CUBE"  && this.kind != "CYLINDER") {
    console.log("この立体の慣性モーメントは求めていません"); return;
  }
  var sx = this.vSize.x; var sy = this.vSize.y; var sz = this.vSize.z;
  var mass = this.mass;
  
  var Ixx, Iyy, Izz;

  if(this.kind == "SPHERE")
  {
    if(sx != sy || sy != sz || sz != sx) { console.log("完全な球にしてください"); return; }
    Ixx = Iyy = Izz = sx * sx * mass / 10.0; //vSizeは直径
  }

  else if(this.kind == "CYLINDER")//円柱
  {
    if(sx != sy) { console.log("完全な円柱にしてください"); return; } 
    Ixx = mass * (sy * sy / 16.0 + sz * sz / 12.0);
    Iyy = mass * (sx * sx / 16.0 + sz * sz / 12.0);
    Izz = mass * (sx * sx + sy * sy) / 16.0;
  }
  else if(this.kind == "CUBE")//直方体(直方体)
  {
    Ixx = mass * (sy * sy + sz * sz) / 12.0;
    Iyy = mass * (sx * sx + sz * sz) / 12.0;
    Izz = mass * (sx * sx + sy * sy) / 12.0;
  }
  //慣性モーメント のテンソル
  this.mInertia.set(Ixx, 0.0, 0.0,
                    0.0, Iyy, 0.0,
                    0.0, 0.0, Izz );
  this.mInertiaInverse.set(1/Ixx, 0.0, 0.0,
                           0.0, 1/Iyy, 0.0,
                           0.0, 0.0, 1/Izz);
}

//-----------------------------------------------------------------------------
Rigid.prototype.calcInertialResistance = function()
{ //x,y,z方向の断面積
  var vArea = new Vector3();

  if(this.kind == "SPHERE")
  {
    vArea.x = Math.PI * this.vSize.y * this.vSize.z / 4.0;
	vArea.y = Math.PI * this.vSize.z * this.vSize.x / 4.0;
	vArea.z = Math.PI * this.vSize.x * this.vSize.y / 4.0;		
  }
  else if(this.kind == "CUBE")
  {
    vArea.x = this.vSize.y * this.vSize.z ;
	vArea.y = this.vSize.z * this.vSize.x ;
	vArea.z = this.vSize.x * this.vSize.y ;
  }
  else if(this.kind == "CYLINDER")//円柱
  {
    vArea.x = this.vSize.y * this.vSize.z ;
    vArea.y = this.vSize.x * this.vSize.z ;
    vArea.z = Math.PI * this.vSize.x * this.vSize.y / 4.0;
  }
  //ci=0.5*CD*ρ*A(CD=1.0, ρ=1.2)
  //見かけの大きさの1/10，面積は1/100倍
  this.vInertialResistance = mul(0.5 * 1.2 * 0.01, vArea); 
}
//---------------------------------------------------------------------
Rigid.prototype.calcRotationalResistance = function()
{
  var gamma = 0.1;//回転抵抗係数の直交成分に対する平行成分の比
  var k_shape;
  var shortR, longR;
  var a = this.vSize.x / 2.0, b = this.vSize.y / 2.0, c = this.vSize.z / 2.0;
  var a2 = a * a, b2 = b * b, c2 = c * c;

  if(this.kind == "SPHERE")
  {
    k_shape = 1.0;
    var ci = (1.0 - (1.0 - gamma) * k_shape) * Math.PI * Math.pow(a, 5.0);
	this.vRotationalResistance = new Vector3(ci, ci, ci);
  }
  else if(this.kind == "CUBE")
  {
    longR = Math.sqrt(b*b + c*c); shortR = Math.min(b, c);
	k_shape = shortR / longR; 
	this.vRotationalResistance.x = (1.0 - (1.0 - gamma) * k_shape) * Math.pow(longR, 3.0) * b * c * 4.0;

	longR = Math.sqrt(a*a + c*c); shortR = Math.min(a, c);
	k_shape = shortR / longR; 
	this.vRotationalResistance.y = (1.0 - (1.0 - gamma) * k_shape) * Math.pow(longR, 3.0) * c * a * 4.0;

    longR = Math.sqrt(a*a + b*b ); shortR = Math.min(a, b);
	k_shape = shortR / longR; 
	this.vRotationalResistance.z = (1.0 - (1.0 - gamma) * k_shape) * Math.pow(longR, 3.0) * a * b * 4.0;
  }
  else if(this.kind == "CYLINDER")
  {
    longR = Math.max(a, b); shortR = Math.min(b, c); 
	k_shape = shortR / longR; 
	this.vRotationalResistance.z = (1.0 - (1.0 - gamma) * k_shape) * Math.pow(longR, 3.0) * a * b * Math.PI;

	longR = Math.sqrt(b*b + c*c); shortR = Math.min(b, c);
	k_shape = shortR / longR; 
	this.vRotationalResistance.x = (1.0 - (1.0 - gamma) * k_shape) * Math.pow(longR, 3.0) * b * c * 4.0;

	longR = Math.max(a, c); shortR = Math.min(a, c);
	k_shape = shortR / longR; 
	this.vRotationalResistance.y = (1.0 - (1.0 - gamma) * k_shape) * Math.pow(longR, 4.0) * a * c * 4.0;
  }
  //見かけのサイズの1/10，CD=1.0としてρCD/2を乗じる(CR=(1/8)*CD*ρ*R^3*A)
  this.vRotationalResistance.mul(0.125 * 1.2 * 0.00001);		
}

//-------------------------------------------------------------------------
Rigid.prototype.calcBoundingRadius = function()
{
  var sx = this.vSize.x;
  var sy = this.vSize.y;
  var sz = this.vSize.z;
  
  if(this.kind == "SPHERE"){ //球
    this.boundingR = sx / 2.0;
  }
  else if(this.kind == "CUBE" ) {//直方体(球体とみなしたときの半径)
    this.boundingR = Math.sqrt(sx * sx + sy *sy + sz * sz) / 2.0;
  }
  else if(this.kind == "CYLINDER"){//円柱
    var a = Math.max(sx, sy);
    this.boundingR = Math.sqrt(a * a + sz * sz) / 2.0;
  }
}
//-----------------------------------------------------------------------------
Rigid.prototype.setVertexOfCube = function()
{
  var sx = this.vSize.x;
  var sy = this.vSize.y;
  var sz = this.vSize.z;

  this.vP0[0].x = sx / 2.0; this.vP0[0].y = sy / 2.0; this.vP0[0].z = sz / 2.0;
  this.vP0[1].x =-sx / 2.0; this.vP0[1].y = sy / 2.0; this.vP0[1].z = sz / 2.0;
  this.vP0[2].x =-sx / 2.0; this.vP0[2].y =-sy / 2.0; this.vP0[2].z = sz / 2.0;
  this.vP0[3].x = sx / 2.0; this.vP0[3].y =-sy / 2.0; this.vP0[3].z = sz / 2.0;
  this.vP0[4].x = sx / 2.0; this.vP0[4].y = sy / 2.0; this.vP0[4].z =-sz / 2.0;
  this.vP0[5].x =-sx / 2.0; this.vP0[5].y = sy / 2.0; this.vP0[5].z =-sz / 2.0;
  this.vP0[6].x =-sx / 2.0; this.vP0[6].y =-sy / 2.0; this.vP0[6].z =-sz / 2.0;
  this.vP0[7].x = sx / 2.0; this.vP0[7].y =-sy / 2.0; this.vP0[7].z =-sz / 2.0;
  this.numVertex = 8;
}
//-----------------------------------------------------------------------------
Rigid.prototype.setVertexOfCylinder = function()
{
  var i, phi, phi0;
  this.numVertex = 2 * this.nSlice + 2;

  if(this.numVertex > MAX_VERTEX) {
    console.log("nSliceを小さくしてください in setVertexOfCylinder");
    return;
  }

  phi0 = 2.0 * Math.PI / this.nSlice;
  for(i = 0;i < this.nSlice;i++)
  {   
    phi = phi0 * i;
	this.vP0[i].x = 0.5 * Math.cos(phi) * this.vSize.x; //上底のx成分
	this.vP0[i].y = 0.5 * Math.sin(phi) * this.vSize.y; //ｙ成分
	this.vP0[i].z = 0.5 * this.vSize.z;                 //ｚ成分(高さ)
	this.vP0[i+this.nSlice].x = this.vP0[i].x;          //下底のx成分
	this.vP0[i+this.nSlice].y = this.vP0[i].y;          //ｙ成分
	this.vP0[i+this.nSlice].z = - 0.5 * this.vSize.z;   //ｚ成分
  }
  //上底の中心
  this.vP0[2*this.nSlice].x = 0.0;
  this.vP0[2*this.nSlice].y = 0.0;
  this.vP0[2*this.nSlice].z = 0.5 * this.vSize.z;
  //下底の中心
  this.vP0[2*this.nSlice+1].x = 0.0;
  this.vP0[2*this.nSlice+1].y = 0.0;
  this.vP0[2*this.nSlice+1].z = -0.5 * this.vSize.z;
}
//-----------------------------------------------------------------------
Rigid.prototype.tumbling = function()
{
  var sx = this.vSize.x; 
  var sy = this.vSize.y;
  //慣性空間における法線ベクトル
  var vNorm = qvRotate(this.q, new Vector3(0.0, 0.0, 1.0));
  if(vNorm.z < 0.0) vNorm.reverse();
  var vVelocityN = norm(this.vVel);//正規化速度
  //紙片の接線ベクトル
  var vTang = cross(vNorm, cross(vVelocityN, vNorm));//接線ベクトル
  vTang.norm();
　//迎え角の計算
  var dotTV = dot(vTang, vVelocityN);
  if(dotTV > 1.0) dotTV = 1.0;
  var phi = Math.acos(dotTV);//迎え角
  var S = sx * sy * 0.01;//紙片の面積
  var rho = 1.2;//空気密度
  var cc = 0.5 * this.coefLift * rho * mag(this.vVel) * Math.sin(2*phi) * S;
  var vForceLift = mul(cc, cross(this.vVel, cross(vNorm, vTang)));//揚力
  this.vForce.add(vForceLift);
  //進行方向の紙片の長さ
  var Length = 0.1 * Math.abs(dot(qvRotate(this.q, new Vector3(sx, sy, 0.0)), vTang));
  //回転トルクの追加
  this.vTorque.add(mul(cross(vTang, vForceLift), this.delta * Length));
}

/*-----------------------------------------------------------------------------
  剛体と剛体の衝突判定
----------------------------------------------------------------------------- */
var NON_COLLISION = -999;
//球同士
Rigid.prototype.collisionSphereWithSphere = function(rigid)
{
	this.vNormal = direction(this.vPos, rigid.vPos);//球1(this)から球2(rig)へ向かう単位法線ベクトル
	//重心から衝突点までのベクトル
	this.vGravityToPoint = mul(this.vSize.x/2.0, this.vNormal);
	rigid.vGravityToPoint = mul(rigid.vSize.x/2.0, this.vNormal);
	rigid.vGravityToPoint.reverse();
	var depth = (this.vSize.x + rigid.vSize.x) / 2.0 - distance(this.vPos, rigid.vPos);
	return depth;//球同士の場合，必ず衝突
}

//------------------------------------------------------------------------------
//球と直方体の衝突判定
//球の中心から辺までの距離 <= 球の半径でかつ
//球の中心が直方体の辺に対して正領域が１つの場合
//直方体の辺と交差するときも衝突（正領域が2つ）
Rigid.prototype.collisionSphereWithCube = function(rigid)
{
  //直方体の面を構成する頂点番号
  var vs = [ [0,1,2,3], [0,3,7,4], [0,4,5,1],
             [1,5,6,2], [2,6,7,3], [4,7,6,5] ];
  //辺を構成する頂点番号(最初の2個）と面番号
  var ve = [ [0,1,0,2], [1,2,0,3], [2,3,0,4], [3,0,0,1],
             [0,4,1,2], [1,5,2,3], [2,6,3,4], [3,7,1,4],
             [4,5,2,5], [5,6,3,5], [6,7,4,5], [7,4,1,5] ];
  var i, j, k, no1, no2;
  var dist = [];//球の中心から面までの距離
  var f, d;//判定式
  var faceNo = []; 
  var cnt;
  var rr = this.vSize.x / 2.0;//球の半径
  var depth;
  var vCollision = new Vector3();//衝突点
  var vDir = new Vector3();

  //衝突対象(#2)の頂点の位置を取得
  for(i = 0; i < rigid.numVertex; i++)
    rigid.vP[i] = add(qvRotate(rigid.q, rigid.vP0[i]) , rigid.vPos);

  //衝突対象(#2)の面の法線ベクトル
  for(j = 0; j < 6; j++)//jは#2の面番号
  {
    rigid.vNormalFacet[j] = cross(sub(rigid.vP[vs[j][1]], rigid.vP[vs[j][0]]) , sub(rigid.vP[vs[j][2]], rigid.vP[vs[j][1]])) ;
    rigid.vNormalFacet[j].norm();
  }
  //球の中心から対象直方体の面までの距離を調査
  cnt = 0;//球の中心が直方体の面の正領域にある回数
  for(j = 0; j < 6; j++) //対象直方体の面番号
  {
    f = dot(rigid.vNormalFacet[j] , sub(this.vPos, rigid.vP[vs[j][0]]));
    if( f >= 0.0 ) 
    {
      faceNo[cnt] = j;
      dist[faceNo[cnt]] = f;//面から球中心点までの距離
      cnt++;
      vCollision = sub(this.vPos , mul(rigid.vNormalFacet[j], rr)); //cnt=1のときの交点候補
    }
  }
  if(cnt == 1)
  { //面と衝突の可能性あり
    this.vNormal = rigid.vNormalFacet[faceNo[0]] ;
	this.vNormal.reverse();
	depth = dot(this.vNormal , sub(vCollision, rigid.vP[vs[faceNo[0]][0]]));
    //重心から衝突点までのベクトル
    this.vGravityToPoint = sub(vCollision, this.vPos) ; //注目剛体側（vPosは中心座標)
    rigid.vGravityToPoint = sub(vCollision, rigid.vPos) ;//対象剛体側
    return depth;
  }
  else if(cnt == 2)
  { //辺と交差の可能性あり
    //面を共有する辺番号
    for(k = 0; k < 12; k++)
    {
      if( faceNo[0] == ve[k][2] && faceNo[1] == ve[k][3] ){
        no1 = ve[k][0]; no2 = ve[k][1]; //交差する辺の頂点番号
        break;
      }
    }
    //辺の方向ベクトル
    vDir = direction(rigid.vP[no1] , rigid.vP[no2]); //
    f = dot(vDir , sub(rigid.vP[no1], this.vPos)) ;
    vCollision = sub(rigid.vP[no1], mul(vDir, f));//球の中心から辺へ垂線を下ろした時の交点
    d = mag(sub(vCollision , this.vPos));//その距離

    if(d > rr) return NON_COLLISION;
    depth = rr - d;
    this.vNormal = direction(this.vPos , vCollision) ;//球の中心から衝突点への単位ベクトル
    //重心から衝突点までのベクトル
    this.vGravityToPoint = sub(vCollision, this.vPos) ; //注目剛体側（vPosは球の中心座標)
    rigid.vGravityToPoint =sub(vCollision, rigid.vPos) ;//対象剛体側
    return depth;
  }
  else return NON_COLLISION;
}

//------------------------------------------------------------------------------
//直方体(直方体)と球の衝突判定
//直方体の頂点が球の内部に存在するとき衝突
Rigid.prototype.collisionCubeWithSphere = function(rigid)
{
  var i, cnt, dist;
  var vCollision = new Vector3();//衝突点

  //直方体の頂点の位置を取得(vP[i]に格納)
  for(i = 0; i <this.numVertex; i++)
  {
    this.vP[i] = qvRotate(this.q, this.vP0[i]);
    this.vP[i].add(this.vPos);
  }

  cnt = 0;
  for(i = 0; i < 8; i++)
  {
    dist = distance(rigid.vPos, this.vP[i]);//球中心から直方体の頂点までの距離
    if(dist < rigid.boundingR) //球の半径以下なら
    {//衝突
      cnt++;
      vCollision.add(this.vP[i]);
    }
  }
  if(cnt == 0) return NON_COLLISION;

  vCollision.div(cnt);
  this.vNormal = sub(rigid.vPos, vCollision);//法線方向
  var depth = rigid.boundingR - mag(this.vNormal);
  this.vNormal.norm();
  //重心から衝突点までのベクトル
  this.vGravityToPoint = sub(vCollision, this.vPos); //直方体(中心から衝突点へ向かうベクトル)
  rigid.vGravityToPoint = sub(vCollision, rigid.vPos);
  return depth;
}

//------------------------------------------------------------------------------
//直方体と直方体の衝突判定
//注目剛体の頂点が対象剛体の内部（境界上を含む)にあるとき衝突
//辺と辺が交差するとき衝突
Rigid.prototype.collisionCubeWithCube = function(rigid)
{
  //面を構成する頂点番号
  var vs = [ [0,1,2,3], [0,3,7,4], [0,4,5,1],
             [1,5,6,2], [2,6,7,3], [4,7,6,5] ];

  var i, j, k;
  var nfvP = [];//交点と辺で作る面の法線ベクトル
  for(i = 0; i < 4; i++) nfvP[i] = new Vector3();
  var f;//判定式
  var min0, dd;
  var minNo, kaisu, cnt, VertexNo = [];
  var vCollision = new Vector3();//衝突点
  var vPoint = [];//面との交点（参照渡しに使用するため配列宣言）
  vPoint[0] = new Vector3();

  //注目剛体の頂点の世界座標空間における位置を取得(vP[i]に格納)
  for(i = 0; i < this.numVertex; i++)
  {
	this.vP[i] = qvRotate(this.q, this.vP0[i]);
	this.vP[i].add(this.vPos);
  }
  //衝突対象(#2)の頂点の世界座標空間における位置を取得
  for(i = 0; i < rigid.numVertex; i++)
  {
	rigid.vP[i] = qvRotate(rigid.q, rigid.vP0[i]);
	rigid.vP[i].add(rigid.vPos);
  }

  //#2の面の法線ベクトル
  for(j = 0; j < 6; j++)//jは#2(対象剛体）の面番号
  {
    rigid.vNormalFacet[j] = cross(sub(rigid.vP[vs[j][1]], rigid.vP[vs[j][0]]) , sub(rigid.vP[vs[j][2]], rigid.vP[vs[j][1]])) ;
    rigid.vNormalFacet[j].norm();
  }
  //注目直方体の全ての頂点について対象剛体の内部にあるかどうかを調査
  cnt = 0;//対象剛体内部にある注目剛体の頂点個数
  for(i = 0; i < 8; i++) //#1の頂点
  {
    kaisu = 0;//判定式が負となる回数
    for(j = 0; j < 6; j++) //#2の面番号
    {
      f = dot(rigid.vNormalFacet[j] , sub(this.vP[i], rigid.vP[vs[j][0]]));
      if( f > 0.001 ) break;//fが全て負のとき衝突
      kaisu ++;
    }
    if( kaisu == 6) //#1の頂点が#2の内部
    {
      VertexNo[cnt] = i;//#2に衝突している#1の頂点番号
      cnt++;
    }
  }
  
  if(cnt != 0)
  {
    //#2の面に衝突している#1の頂点をすべて求め平均値を衝突点とする
    vCollision = new Vector3();//衝突点のクリア
    for(k = 0; k < cnt; k++) 
    {
      vCollision.add(this.vP[VertexNo[k]]);//衝突点を追加
    }
    //衝突点
    vCollision.div(cnt);//平均値
    //辺と辺が交差していればその部分の交点を追加し平均
    if(this.getPointCubeWithCube(rigid, vPoint) == true)
    {
      vCollision.add(vPoint[0]);
      vCollision.div(2.0);
    }

    //最も近い面番号minNoを決定
    f = dot(rigid.vNormalFacet[0] , sub(vCollision, rigid.vP[vs[0][0]]));
    min0 = Math.abs(f) / mag(rigid.vNormalFacet[0]) ;//面までの距離(めり込み量）
    minNo = 0;
    for(j = 1; j < 6; j++)//jは対象剛体の面番号
    {
      f = dot(rigid.vNormalFacet[j] , sub(vCollision, rigid.vP[vs[j][0]]));
      dd = Math.abs(f) / mag(rigid.vNormalFacet[j]) ;//面までの距離
      if( dd < min0 )
      {
          min0 = dd;
          minNo = j;
      }
    }
    //その面の法線ベクトルを反転
    this.vNormal = reverse(rigid.vNormalFacet[minNo]);

    //重心から衝突点までのベクトル
    this.vGravityToPoint = sub(vCollision, this.vPos) ; //注目剛体側（vPosは中心座標)
    rigid.vGravityToPoint = sub(vCollision, rigid.vPos) ;//対象剛体側
    return min0;
  }
  else//辺と辺の交差
  {
    if(!this.getPointCubeWithCube(rigid, vPoint)) return NON_COLLISION;
    //最も近い面番号minNoを決定
    f = dot(rigid.vNormalFacet[0] , sub(vPoint[0], rigid.vP[vs[0][0]]));
    min0 = Math.abs(f) / mag(rigid.vNormalFacet[0]) ;//j=0の面までの距離
    minNo = 0;
    for(j = 1; j < 6; j++)//jは対象剛体の面番号
    {
      f = dot(rigid.vNormalFacet[j] , sub(vPoint[0], rigid.vP[vs[j][0]]));
      dd = Math.abs(f) / mag(rigid.vNormalFacet[j]) ;//面までの距離
      if( dd < min0)
      {
          min0 = dd;
          minNo = j;
      }
    }
    if(this.vNormal.x == 0.0 && this.vNormal.y == 0.0 && this.vNormal.z == 0.0 ) this.vNormal = rigid.vNormalFacet[minNo];
 
	this.vNormal.norm();//隣り合う面のときは和の正規化で近似
    //その面の法線ベクトルを反転
    this.vNormal.reverse();

    //重心から衝突点までのベクトル
    this.vGravityToPoint = sub(vPoint[0], this.vPos) ; //注目剛体側（vPosは中心座標)
    rigid.vGravityToPoint = sub(vPoint[0], rigid.vPos) ;//対象剛体側

    return min0;
  }
}
//---------------------------------------------------------------------
//注目剛体の辺が対象剛体の面と交差している点を加え平均をとり衝突点とする
//辺の両端が１つの面の外側であればその辺は交差しない
//面と面が十字状にクロスしているときも判定
Rigid.prototype.getPointCubeWithCube = function(rigid, vPoint)
{
  //直方体の面を構成する頂点番号
  var vs = [ [0,1,2,3], [0,3,7,4], [0,4,5,1],
             [1,5,6,2], [2,6,7,3], [4,7,6,5] ];
  //辺を構成する頂点番号
  var ve = [ [0,1], [1,2], [2,3], [3,0],
             [0,4], [1,5], [2,6], [3,7],
             [4,5], [5,6], [6,7], [7,4] ];

  var i, j, k, kp, kaisu, cnt;
  var fa, fb, tt;
  var vNormal0 = [];//交点と辺で作る面の法線ベクトル
  for(i = 0; i < 4; i++) vNormal0[i] = new Vector3(); 
  var vPoint0 = new Vector3();    //交点

  kaisu = 0; //注目剛体の辺が対象剛体の面と交差する回数
  vPoint[0] = new Vector3(); //交差点
  this.vNormal = new Vector3(); //面の法線方向の和
  for(i = 0; i < 12; i++) //注目直方体の辺
  {
    for(j = 0; j < 6; j++)//対象直方体の面
    { //辺の頂点が対象剛体の面の正領域か負領域か
      fa = dot(rigid.vNormalFacet[j] , sub(this.vP[ve[i][0]], rigid.vP[vs[j][0]]));
      fb = dot(rigid.vNormalFacet[j] , sub(this.vP[ve[i][1]], rigid.vP[vs[j][0]]));
      if(fa * fb >= 0.0) continue;//同じ領域にあれば交差しない
      tt = fa / (fa - fb);
      vPoint0 = add(mul(sub(this.vP[ve[i][1]], this.vP[ve[i][0]]) , tt), this.vP[ve[i][0]]);//平面との交点
      cnt = 0;
      for(k = 0; k < 4; k++)//交点を持つ面の辺
      {
        kp = k+1;
        if(kp == 4) kp = 0;
        vNormal0[k] = cross(sub(rigid.vP[vs[j][k]], vPoint0) , sub(rigid.vP[vs[j][kp]], rigid.vP[vs[j][k]])) ;
        if(dot(rigid.vNormalFacet[j] , vNormal0[k]) < 0.0) break;//１つでも負ならばこの面とは交差しない
		cnt++;
      }
      if(cnt == 4)
      {//交差
        kaisu++;
        vPoint[0].add(vPoint0);
        this.vNormal.add(rigid.vNormalFacet[j]);
      }
    }
  }
  if(kaisu != 2 && kaisu != 4 && kaisu != 8) return false;//交差なし
  vPoint[0].div(kaisu);
  return true;
}
//------------------------------------------------------------------
//球と円柱の衝突判定
//球の中心から円柱の中心軸までの距離 <= 球の半径＋円柱の半径(側面衝突）
//上底または下底と衝突（球の中心は上底または下底の外部)
//どちらも衝突点が円柱の上底と下底の中間に存在
Rigid.prototype.collisionSphereWithCylinder = function(rigid)
{
  var dist;//球の中心から円柱中心軸までの距離
  var depth;//めり込み量
  var h1, h2;
  var rr = this.vSize.x / 2.0;//球の半径
  var vCollision;//衝突点
  var vKoten;//球の中心から円柱中心軸へ下ろした垂線の交点

  //球の頂点
  for(var i = 0; i < this.numVertex; i++)
  {
	this.vP[i] = qvRotate(this.q, this.vP0[i]);
	this.vP[i].add(this.vPos);
  }

  //対象円柱の頂点
  for(var i = 0; i < rigid.numVertex; i++)
  {
	rigid.vP[i] = qvRotate(rigid.q, rigid.vP0[i]);
	rigid.vP[i].add(rigid.vPos);
  }
  //円柱中心軸ベクトル
  var vCenter = direction(rigid.vP[2*rigid.nSlice + 1], rigid.vP[2*rigid.nSlice]);
  //球の中心から円柱中心軸へ下ろした垂線の交点
  vKoten = sub(rigid.vP[2*rigid.nSlice+1] , mul(vCenter, dot(vCenter, sub(rigid.vP[2*rigid.nSlice+1], this.vPos))));//vPosは球の中心
  //球の中心から交点までの距離
  dist = mag(sub(vKoten, this.vPos));
  //衝突の最低条件
  if(dist > rr + Math.max(rigid.vSize.x, rigid.vSize.y) / 2.0) return NON_COLLISION;

  //球の中心から上底、下底までの距離
  h1 = Math.abs(dot(vCenter , sub(this.vPos, rigid.vP[2*rigid.nSlice]))); //上底までの距離
  h2 = Math.abs(dot(vCenter , sub(this.vPos, rigid.vP[2*rigid.nSlice+1])));//下底までの距離
  //側面衝突
  if(h1 < rigid.vSize.z && h2 < rigid.vSize.z)
  {
    this.vNormal = sub(this.vPos, vKoten);
    vCollision = add(vKoten, mul(this.vNormal, rigid.vSize.x / 2.0)) ;
    depth = rr + rigid.vSize.x/2.0 - mag(this.vNormal);
    this.vNormal.norm();
  }
  else//上底または下底と衝突
  {
	if((h1 < rr || h2 < rr) && dist > Math.max(rigid.vSize.x, rigid.vSize.y) / 2.0) return NON_COLLISION;
	//if(h1 > rr || h2 > rr || dist > Math.max(rigid.vSize.x, rigid.vSize.y) / 2.0) return NON_COLLISION;

    if(h1 <= rr )//上底側で衝突
    {
      this.vNormal = vCenter;
      vCollision = sub(this.vPos, mul(this.vNormal, dot(this.vNormal , sub(this.vPos, rigid.vP[2*rigid.nSlice]))));
      depth = rr - h1;
    }
    else if(h2 <= rr )//下底側で衝突
    {
      this.vNormal = reverse(vCenter);
      vCollision = sub(this.vPos, mul(this.vNormal, dot(this.vNormal , sub(this.vPos, rigid.vP[2*rigid.nSlice+1]))));
      depth = rr - h2;
    }
    else return NON_COLLISION;
  }
  this.vNormal.reverse();//注目剛体側から見た法線方向

  //重心から衝突点までのベクトル
  this.vGravityToPoint = sub(vCollision, this.vPos) ; //注目剛体側（vPosは球の中心座標)
  rigid.vGravityToPoint = sub(vCollision, rigid.vPos) ;//対象剛体側
  return depth;
}
//------------------------------------------------------------------------------
//円柱と球の衝突判定
//円柱の頂点が球の内部に存在するとき衝突
Rigid.prototype.collisionCylinderWithSphere = function(rigid)
{
  var i, cnt, dist;
  var vCollision = new Vector3();//衝突点

  for(i = 0; i < this.numVertex; i++)
  {
	this.vP[i] = qvRotate(this.q, this.vP0[i]);
	this.vP[i].add(this.vPos);
  }
  
  cnt = 0;
  for(i = 0; i < 2*this.nSlice; i++)
  {
    dist = mag(sub(rigid.vPos, this.vP[i])); //球中心から円柱の頂点までの距離
    if(dist < rigid.vSize.x / 2.0) //球の半径以下なら
    {//衝突
      cnt++;
      vCollision.add(this.vP[i]);
    }
  }
  if(cnt == 0) return NON_COLLISION;

  vCollision.div(cnt);
  this.vNormal = sub(rigid.vPos, vCollision);//法線方向
  var depth = rigid.vSize.x / 2.0 - mag(this.vNormal);
  this.vNormal.norm();
  //重心から衝突点までのベクトル
  this.vGravityToPoint = sub(vCollision, this.vPos); //直方体(中心から衝突点へ向かうベクトル)
  rigid.vGravityToPoint = sub(vCollision, rigid.vPos);
  return depth;
}

//------------------------------------------------------------------------------
//円柱同士の衝突判定
//円柱の頂点が他方の円柱の内部（境界上を含む)にあるとき衝突
//辺と辺の交差による衝突
Rigid.prototype.collisionCylinderWithCylinder = function(rigid)
{
  var h1, h2, aveH1, aveH2, dist0, dist;
  var vCollision = new Vector3() ;//衝突点
  var vKoten = new Vector3();//衝突点から対象円柱の中心軸へ下ろした垂線の交点
  vKotenTop = new Vector3();
  vKotenBtm = new Vector3();
  vDir = new Vector3();
  var i, cnt;
  var flagCollisionInfinite = false;
  var a2 = rigid.vSize.x * rigid.vSize.x / 4.0;
  var b2 = rigid.vSize.y * rigid.vSize.y / 4.0;
  var depth;

  //注目円柱(#1,円柱)の頂点の位置を取得
  for(i = 0; i < this.numVertex; i++)
  {
	this.vP[i] = add(qvRotate(this.q, this.vP0[i]), this.vPos);
  }
  //衝突対象(#2,円柱)の頂点の位置を取得
  for(i = 0; i < rigid.numVertex; i++)
  {
	rigid.vP[i] = add(qvRotate(rigid.q, rigid.vP0[i]), rigid.vPos);
  }

  var vCenter1 = direction(this.vP[2*this.nSlice+1], this.vP[2*this.nSlice]);//注目円柱の中心軸ベクトル(下底->上底）
  var vCenter2 = direction(rigid.vP[2*rigid.nSlice+1], rigid.vP[2*rigid.nSlice]);//対象円柱の中心軸ベクトル
  //中心軸間の最短距離
  if( mag(sub(vCenter1, vCenter2)) == 0.0 || mag(add(vCenter1, vCenter2)) == 0.0){  //２直線が平行
    //注目円柱の中心から対象中心軸へ下ろした垂線の交点
    vKoten = sub(rigid.vPos, mul(vCenter2, dot(vCenter2 , sub(rigid.vPos, this.vPos))));
    dist0 = distance(vKoten, this.vPos);
  }
  else
    dist0 = Math.abs(dot(sub(this.vPos, rigid.vPos) , cross(vCenter1 , vCenter2)));

  //最初の衝突判定
  if(dist0 > this.vSize.x/2.0 + rigid.vSize.x/2.0) return NON_COLLISION;
  
  if(this.vSize.x <= this.vSize.z)
  {
    if(rigid.vSize.x <= rigid.vSize.z)
    {
      //円柱を球とみなして衝突判定
      depth = this.collisionSphereWithSphere(rigid);
     if(depth > 0) return depth;
    }
    else
    {
      depth = this.collisionSphereWithCylinder(rigid);
     if(depth > 0) return depth;
    }
  }
      
  //注目円柱の全ての頂点について対象剛体の内部にあるかどうかを調査
  cnt = 0;//対象剛体内部にある注目剛体の頂点個数
  aveH1 = 0.0; aveH2 = 0.0;
  var vAveKoten = new Vector3();
  for(i = 0; i < 2*this.nSlice; i++) //#1の頂点
  {
    //#1の頂点から#2中心軸に落とした垂線の交点
    vKoten = sub(rigid.vP[2*rigid.nSlice+1], mul(vCenter2, dot(vCenter2, sub(rigid.vP[2*rigid.nSlice+1], this.vP[i]))));
    dist = distance(vKoten, this.vP[i]);//注目円柱の頂点から対象円柱中心軸までの距離
    if(dist <= rigid.vSize.x / 2.0 + 0.001) //円柱の半径以下なら衝突の可能性あり
    {
      flagCollisionInfinite = true;

	  h1 = Math.abs(dot(vCenter2 , sub(vKoten, rigid.vP[2*rigid.nSlice]))); //上底までの距離
	  h2 = Math.abs(dot(vCenter2 , sub(vKoten, rigid.vP[2*rigid.nSlice+1])));//下底までの距離
	  if(h1 <= rigid.vSize.z+0.0001 && h2 <= rigid.vSize.z+0.0001)
	  {//衝突
        cnt++;
        aveH1 += h1;
        aveH2 += h2;
		vAveKoten.add(vKoten);
		vCollision.add(this.vP[i]);
      }
    }
  }
  if(flagCollisionInfinite == true && cnt == 0) return NON_COLLISION;//無限円柱の内部にあるが，有限円柱の外部
  
  if(cnt != 0)
  {
    //#2の面に衝突している#1の頂点の平均値を衝突点とする
    vCollision.div(cnt);
	aveH1 /= cnt;
	aveH2 /= cnt;
	vAveKoten.div(cnt);
 
	depth = this.getDepthOfCollisionInCylinder(rigid, vCenter2, vCollision, vAveKoten, aveH1, aveH2);
	return depth;
  }

  //辺と辺の交差を調査
  //注目円柱のside edgeが対象円柱と交差している点を加え平均をとり衝突点とする
  //side edgeが無限長の対象円柱と交差するか調べ，交差したならば
  //その交点が両方の円柱の上底と下底の間に存在するとき交差

  //注目剛体の中心軸方向
  var vCenter = qvRotate(conjugate(rigid.q), vCenter1);
  //対象物体座標系の基本姿勢で調査
  cnt = 0;
  vCollision = new Vector3(0.0, 0.0, 0.0);
  var vCollision0 = new Vector3();
  var vCollision1 = new Vector3();
  for(i = 0; i < this.nSlice; i++)
  {
    //注目円柱の side edge 起点(下底）:方向はvCenter
    var vQ = qvRotate(conjugate(rigid.q), sub(this.vP[i+this.nSlice], rigid.vPos));
    var a = vCenter.x * vCenter.x + vCenter.y * vCenter.y;
    var b = (vQ.x * vCenter.x + vQ.y * vCenter.y);
    var c = vQ.x * vQ.x + vQ.y * vQ.y - rigid.vSize.x * rigid.vSize.x / 4.0;
    //判別式
    var D = b * b - a * c;
    if( D < 0.0) continue;//外部
    else if(D == 0.0)//対象剛体の側面上
    {
      vCollision0 = vQ + (- b / a) * vCenter;
      if(vCollision0.z > -rigid.vSize.z/2 && vCollision0.z < rigid.vSize.z/2) 
	  {
	    vCollision.add(vCollision0);
	    cnt++;
	  }
      continue;
    }
	else//内部
	{
	  vCollision0 = vQ + (-(b + Math.sqrt(D)) / a) * vCenter;
	  vCollision1 = vQ + (-(b - Math.sqrt(D)) / a) * vCenter;
	  if(vCollision0.z > -rigid.vSize.z/2 && vCollision0.z < rigid.vSize.z/2)
	  {
	    if(vCollision1.z < -rigid.vSize.z/2) vCollision1.z = - rigid.vSize.z/2;
	    if(vCollision1.z > rigid.vSize.z/2)  vCollision1.z =   rigid.vSize.z/2;
	    vCollision.add( add(vCollision0, vCollision1) );
	    cnt += 2;
	    continue;
	  }
	  else if(vCollision0.z < -rigid.vSize.z/2)
	  {
	    if(vCollision1.z < -rigid.vSize.z/2) continue;
	    if(vCollision1.z > -rigid.vSize.z/2 && vCollision1.z < rigid.vSize.z/2)
	    {
	      vCollision0.z = - rigid.vSize.z/2; 
	    }
		else if(vCollision1.z > rigid.vSize.z/2)
		{
		  vCollision0.z = - rigid.vSize.z/2; 
		  vCollision1.z =   rigid.vSize.z/2;
        }
		vCollision.add( add(vCollision0, vCollision1) );
		cnt += 2;
		continue;
	  }
	  else if(vCollision0.z > rigid.vSize.z/2)
	  {
	    if(vCollision1.z > rigid.vSize.z/2) continue;
	    if(vCollision1.z > -rigid.vSize.z/2 && vCollision1.z < rigid.vSize.z/2)
	    {
	      vCollision0.z = rigid.vSize.z/2; 
	    }
	    else if(vCollision1.z < -rigid.vSize.z/2)
	    {
	   	  vCollision0.z =   rigid.vSize.z/2; 
		  vCollision1.z = - rigid.vSize.z/2;
	    }
		vCollision.add( add(vCollision0, vCollision1) );
		cnt += 2;
		continue;
	  }
    }
  }
  if(cnt == 0) return NON_COLLISION;
  vCollision.div(cnt);
  //めり込み量
  depth = rigid.vSize.x/2.0 - Math.sqrt(vCollision.x*vCollision.x + vCollision.y*vCollision.y);//長半径からの距離で近似
  //対象楕円柱の法線方向
  this.vNormal = new Vector3(vCollision.x / a2, vCollision.y / b2, 0.0);
  this.vNormal = qvRotate(rigid.q, this.vNormal);//世界座標系に戻す
  if(mag(this.vNormal) <= 0.0001) return NON_COLLISION;//相殺されたとき
  this.vNormal.norm();
  this.vNormal.reverse();//物体#1から見た法線方向

  //衝突点を世界座標に戻す
  vCollision = add(qvRotate(rigid.q, vCollision), rigid.vPos);

  //衝突点が注目円柱の内部か
  h1 = Math.abs(dot(vCenter1 , sub(vCollision, this.vP[2*nSlice])));//注目円柱の上底までの距離
  h2 = Math.abs(dot(reverse(vCenter1) , sub(vCollision, this.vP[2*nSlice+1])));//注目円柱の下底までの距離
  if(h1 > vSize.z) return NON_COLLISION;
  if(h2 > vSize.z) return NON_COLLISION;

  //重心から衝突点までのベクトル
  this.vGravityToPoint = sub(vCollision, this.vPos) ; //注目剛体側（vPosは中心座標)
  rigid.vGravityToPoint = sub(vCollision, rigid.vPos) ;//対象剛体側
  return depth;
	
}
//---------------------------------------------------------------------------------------------
Rigid.prototype.getDepthOfCollisionInCylinder = function(rigid, vCenter, vCollision, vKoten, aveH1, aveH2)
{
  var depth;

  //相対速度ベクトル
  var vDir = sub(add(this.vVel, cross(this.vOmega , sub(vCollision, this.vPos))),
                 add(rigid.vVel, cross(rigid.vOmega , sub(vCollision, rigid.vPos))));//#2に対する#1の衝突点へ向かう衝突点の速度ベクトル
  vDir.norm();

  var ss;
  //側面から衝突点までの距離
  ss = rigid.vSize.x / 2.0 - distance(vCollision, vKoten);
  
  var c = dot(vCenter , vDir);
  if(Math.abs(c) > 0.01)//中心軸に直交せずに衝突
  {
	if(ss > aveH1)
    {//衝突点がTopに近い
      this.vNormal = reverse(vCenter);
	  depth = aveH1;
	}
	else if(ss > aveH2)
    {//Bottomに近い
	  this.vNormal = vCenter;
	  depth = aveH2;
	}
	else
    {//側面に衝突
      this.vNormal = direction(vCollision, vKoten) ;
      this.vNormal.norm();
	  depth = ss;
	}
  }
  else//側面同士の衝突
  {
    this.vNormal = direction(vCollision, vKoten) ;
    this.vNormal.norm();
    depth = ss;
  }
  //重心から衝突点までのベクトル
  this.vGravityToPoint = sub(vCollision, this.vPos) ; //注目剛体側（vPosは中心座標)
  rigid.vGravityToPoint = sub(vCollision, rigid.vPos) ;//対象剛体側
  return depth;
}

//------------------------------------------------------------------------------
//直方体と円柱の衝突判定
//直方体の頂点が円柱の内部に存在するとき衝突
//面と側面（辺）の衝突
Rigid.prototype.collisionCubeWithCylinder = function(rigid)
{
  var i, j, cnt;
  var depth;//めり込み量
  var aveH1, aveH2;//平均値
  var vCollision;//衝突点
  var vCenter;//円柱中心軸方向ベクトル
  var vKoten, vAveKoten ;//直方体の頂点から円柱の中心軸へ下ろした垂線の交点とその平均値
  var a2 = rigid.vSize.x * rigid.vSize.x / 4.0;
  var b2 = rigid.vSize.y * rigid.vSize.y / 4.0;

  //直方体の頂点の世界座標位置を取得(this.vP[i]に格納)
  for(i = 0; i < this.numVertex; i++)
  {
	this.vP[i] = add(qvRotate(this.q, this.vP0[i]) , this.vPos);
  }
  //対象円柱の頂点の世界座標位置を取得(rigid.vP[i]に格納)
  for(i = 0; i < rigid.numVertex; i++)
  {
	rigid.vP[i] = add(qvRotate(rigid.q, rigid.vP0[i]) , rigid.vPos);
  }
  //円柱の中心軸
  vCenter = direction(rigid.vP[2*rigid.nSlice+1] , rigid.vP[2*rigid.nSlice]) ;//中心軸単位ベクトル(下底->上底）
  vCollision = new Vector3();
  cnt = 0;
  vAveKoten = new Vector3();
  aveH1 = 0.0; aveH2 = 0.0;
  for(i = 0; i < this.numVertex; i++)//注目剛体の各頂点
  {
    //対象円柱の物体座標(基本姿勢)における直方体の侵入頂点位置
	var vQ = qvRotate(conjugate(rigid.q), sub(this.vP[i], rigid.vPos));
	var f =  vQ.x*vQ.x / a2 + vQ.y*vQ.y / b2 -1.0;
	if(f > 0.0) continue;
	if(vQ.z <= rigid.vSize.z / 2.0 && vQ.z >= -rigid.vSize.z / 2.0)
	{//衝突
      cnt++;
	  vKoten = sub(rigid.vPos , mul(vCenter, dot(vCenter, sub(rigid.vPos, this.vP[i]))));//注目剛体の各頂点から円柱中心軸へ降ろした垂線の交点
      vCollision.add(this.vP[i]);//侵入した頂点を衝突点に近似
      vAveKoten.add(vKoten);
      aveH1 += rigid.vSize.z/2.0 - vQ.z;//h1;//上底までの平均距離
      aveH2 += vQ.z + rigid.vSize.z/2.0;//h2;//下底までの平均距離
    }
  }
  if(cnt == 0) return NON_COLLISION;

  vCollision.div(cnt);
  vAveKoten.div(cnt);
  aveH1 /= cnt;
  aveH2 /= cnt;


  //側面から衝突点までの距離
  ss = rigid.vSize.x / 2.0 - distance(vCollision, vAveKoten);

  if(ss > aveH1)
  {//衝突点がTopに近い
    this.vNormal = reverse(vCenter);
    depth = aveH1;
  }
  else if(ss > aveH2)
  {//Bottomに近い
    this.vNormal = vCenter;
    depth = aveH2;
  }
  else
  {//側面に衝突
    this.vNormal = direction(vCollision, vAveKoten) ;
    this.vNormal.norm();
    depth = ss;
  }
  //重心から衝突点までのベクトル
  this.vGravityToPoint = sub(vCollision, this.vPos) ; //注目剛体側（vPosは中心座標)
  rigid.vGravityToPoint = sub(vCollision, rigid.vPos) ;//対象剛体側
  return depth;

}

//------------------------------------------------------------------------------
//円柱と直方体の衝突判定
//円柱の頂点が直方体の内部（境界上を含む)にあるとき衝突とする
//辺と辺の交差も考慮
Rigid.prototype.collisionCylinderWithCube = function(rigid)
{
  //面を構成する頂点番号（対象直方体）
  var vs = [ [0,1,2,3], [0,3,7,4], [0,4,5,1],
             [1,5,6,2], [2,6,7,3], [4,7,6,5] ];

  var i, j, k;
  var dist = [];//頂点から面までの距離
  var f;//判定式
  var dd, depth;
  var VertexNo = [];//[MAX_VERTEX];
  var kaisu, cnt;
  var vCollision;//衝突点
  var vPoint;
  var vCenter;//円柱の中心軸

  //最初に円柱を球とみなして判定
  if(this.vSize.x <= this.vSize.z)
  {
    depth = this.collisionSphereWithCube(rigid);
    if(depth > 0) return depth;
  }
  
  //注目剛体(#1,円柱)の頂点の位置を取得
  for(i = 0; i < this.numVertex; i++)
  {
	this.vP[i] = qvRotate(this.q, this.vP0[i]);
	this.vP[i].add(this.vPos);
  }
  //衝突対象(#2,直方体)の頂点の位置を取得
  for(i = 0; i < rigid.numVertex; i++)
  {
	rigid.vP[i] = qvRotate(rigid.q, rigid.vP0[i]);
	rigid.vP[i].add(rigid.vPos);
  }

  //#2の面の法線ベクトル
  for(j = 0; j < 6; j++)//jは#2の面番号
  {
    rigid.vNormalFacet[j] = cross(sub(rigid.vP[vs[j][1]], rigid.vP[vs[j][0]]) , sub(rigid.vP[vs[j][2]], rigid.vP[vs[j][1]])) ;
    rigid.vNormalFacet[j].norm();
  }

  //注目円柱の全ての頂点について対象剛体の内部にあるかどうかを調査
  cnt = 0;//対象剛体内部にある注目剛体の頂点個数
  for(i = 0; i < this.numVertex; i++) //#1の頂点
  {
    kaisu = 0;//判定式が負となる回数(負のとき直方体の内側）
    for(j = 0; j < 6; j++) //#2の面番号
    {
      f = dot(rigid.vNormalFacet[j] , sub(this.vP[i], rigid.vP[vs[j][0]]));
      if( f > 0.001 ) break; 
      //fが全て負のとき衝突
      dist[6 * i + j] = Math.abs(f) / mag(rigid.vNormalFacet[j]) ;//面までの距離
      kaisu ++;
    }
    if( kaisu == 6) //#1の頂点が#2の内部
    {
       VertexNo[cnt] = i;//#2に衝突している#1の頂点番号
       cnt++;
    }
  }
  if(cnt == 0) //辺対辺を調査
  {
    var vPoint = []//1個であるが配列扱い（参照渡し）
    vPoint[0] = new Vector3();//衝突点
    depth = this.getPointCylinderInCube(rigid, vPoint) ;
  //重心から衝突点までのベクトル
    this.vGravityToPoint = sub(vPoint[0] , this.vPos) ; //注目剛体側（vPosは中心座標)
    rigid.vGravityToPoint = sub(vPoint[0] , rigid.vPos) ;//対象剛体側
    return depth;
  }
  else//点対面を調査
  {//円柱の点対直方体の面
    vCollision = new Vector3();//衝突点のクリア
    for(k = 0; k < cnt; k++)
    {
      vCollision.add(this.vP[VertexNo[k]]);//衝突点を追加
    }
    //衝突点
    vCollision.div(cnt);//平均値
	//円柱の頂点が1つでも直方体の内部のとき面までの距離と面番号を求める
    var cnt0 = 0;
    depth = 1000;//大きな値に設定
    var candidateNo;
    for(j = 0; j < 6; j++)
    {
      dd = Math.abs(dot(rigid.vNormalFacet[j] , sub(vCollision, rigid.vP[vs[j][0]])))/mag(rigid.vNormalFacet[j]) ;//面までの距離
      if(dd < rigid.vSize.x / 4)
      {
	    //最も近い面番号とその距離を求める
	    if(dd < depth) { depth = dd; candidateNo = j;}// depth = dd;}
        cnt0++;
      }
    }
    if(cnt0 == 0) return NON_COLLISION;
    this.vNormal = reverse(rigid.vNormalFacet[candidateNo]);

    this.vNormal.norm();   
    //重心から衝突点までのベクトル
    this.vGravityToPoint = sub(vCollision , this.vPos) ; //注目剛体側（vPosは中心座標)
    rigid.vGravityToPoint = sub(vCollision , rigid.vPos) ;//対象剛体側
    return depth;
  }
}

//---------------------------------------------------------------------
Rigid.prototype.getPointCylinderInCube = function(rigid, vPoint)
{
  //注目剛体の辺(edge)が対象剛体の面と交差しているときその交点を加え平均をとり衝突点とする
  //注目剛体の線分の両端が対象剛体の１つの面の外側であればその線分は交差しない

  //面を構成する頂点番号（対象直方体）
  var vs = [ [0,1,2,3], [0,3,7,4], [0,4,5,1],
             [1,5,6,2], [2,6,7,3], [4,7,6,5] ];

  var i, j, k, kp, cnt, kosu;
  var fa, fb, tt;
  var fNo = [];
  var vNormal0 = [];//[4];//交点と辺で作る面の法線ベクトル
  var vPoint0;    //交点

  //辺を構成する頂点番号(注目円柱)
  var ve = [];
  for(i = 0; i < this.nSlice; i++){
    ve[2*i] = i; ve[2*i+1] = i + this.nSlice;
  }

  kosu = 0;
  vPoint[0] = new Vector3();
  for(i = 0; i < this.nSlice; i++) //注目円柱の線分
  {
    for(j = 0; j < 6; j++)//対象直方体の面
    {
      fa = dot(rigid.vNormalFacet[j] , sub(this.vP[ve[i*2]], rigid.vP[vs[j][0]]));
      fb = dot(rigid.vNormalFacet[j] , sub(this.vP[ve[i*2+1]], rigid.vP[vs[j][0]]));
      if(fa * fb >= 0.0) continue;//この面とは交差しない
      tt = fa / (fa - fb);
      vPoint0 = add(mul(sub(this.vP[ve[i*2+1]], this.vP[ve[i*2]]), tt), this.vP[ve[i*2]]);//平面との交点
      cnt = 0;
      for(k = 0; k < 4; k++)//交点を持つ直方体面の辺
      {
        kp = k+1;
        if(kp == 4) kp = 0;
        vNormal0[k] = cross(sub(rigid.vP[vs[j][k]], vPoint0) , sub(rigid.vP[vs[j][kp]], rigid.vP[vs[j][k]])) ;
        if(dot(rigid.vNormalFacet[j] , vNormal0[k]) < 0.0) break;//１つでも負ならばこの面とは交差しない
        cnt++;
      }
      if(cnt == 4)
      {//交差
        vPoint[0].add(vPoint0);
        fNo[kosu] = j;
        kosu++; //直方体の面と交差している回数
      }
    }
  }
  if(kosu == 0) return NON_COLLISION;//２つの剛体は独立
  vPoint[0].div(kosu);
  var vCenter = direction(this.vP[2*this.nSlice+1] , this.vP[2*this.nSlice]);//下底から上底の中心軸方向
  var vA = sub(vPoint[0], this.vP[2*this.nSlice+1]);//中心軸から交点へ向かうベクトル
  this.vNormal = sub(vA , mul(vCenter, dot(vCenter, vA)));
  this.vNormal.norm();
  var depth = dot(rigid.vNormalFacet[fNo[0]] , sub(rigid.vP[vs[fNo[0]][0]], vPoint[0])) * 1.2;
  return depth;
}



