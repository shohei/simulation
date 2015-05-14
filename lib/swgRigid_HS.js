/*----------------------------------------------------------------------------
   階層構造用Rigidクラス
   2014.9.17 更新
----------------------------------------------------------------------------*/

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

function Rigid_HS()
{
  //プロパティ
  this.kind = "SPHERE";
  this.diffuse = [0.6, 0.6, 0.6, 1.0];
  this.ambient = [0.4, 0.4, 0.4, 1.0];
  //this.specular = [0.8, 0.8, 0.8, 1.0];
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
  this.size1 = [0.5, 0.2, 0.5];  
  this.size2 = [0.5, 0.2, 0.5];   
  this.middle = 0.5; //中間のサイズ
  this.angle2 = 0;//曲げる角度（度）
  this.jStart = 1;
  this.type = 0;//0,1,2だけ               
}

Rigid_HS.prototype.initVertexBuffers = function(gl)
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

Rigid_HS.prototype.draw = function(gl, n, modelMatrix)
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
