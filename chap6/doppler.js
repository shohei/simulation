/*-----------------------------------------------
     doppler.js
     2次元波動方程式の解
     カラーマップ表示を追加
     固定障害物を追加
------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var rigid;//表示オブジェクト
var flagDebug = false;
//animation
var fps = 0; //フレームレート
var lastTime = 0;
//var frameTime = 0;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
//波
var NX0 = 50;//dummyを含まない有効領域分割数
var NY0 = 50;
var NX = 80;//dummyを含む分割数
var NY = 80;
var DX, DY;
var nDummy = 30;
var sizeX0 = 10; //dummyを含まない有効領域サイズ[m]
var sizeY0 = 10; //dummyを含む[m]
var sizeX = 10; //[m]
var sizeY = 10; //[m]
var period = 1;  //[s]
var freq = 1;    //[Hz]
var lambda = 1;  //[m]
var amp0 = 0.4;  //[m]
var waveVel = 1;//伝搬速度
var mu0 = 0.0;//粘性抵抗

var sourceY0 = -5.0;//波源のy座標
var vel = []; //z軸方向の速度
var pos = []; //変位量

var w_object;//波全体を1個のオブジェクトで表示
var colorMode = 0;
//移動物体
var obstacle;
var speed = 0.5;
var obsPos0 = new Vector3(0.0, -4, 0);//初期位置
var moveMode = "LINE";
var obsRadius = 4;

function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');

  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);//webgl-utils.js
  if(!gl) 
  {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }

  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE))
  {
    alert("GLSL初期化に失敗");
    return;
  }
 
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.1, 0.1, 0.1, 1.0);
  gl.enable(gl.DEPTH_TEST);
  
  initCamera();
  initData();
  display();
 
  var timestep = 0;
  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
//    elapseTime += frameTime;//全経過時間
    elapseTime1 += frameTime;
    fps ++;
    if(elapseTime1 >= 0.5)
    {
      form1.fps.value = 2*fps.toString(); //1秒間隔で表示
      timestep = 1 / (2*fps);
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;　
    
    if(flagStart)
    {
      elapseTime += frameTime;//全経過時間
      renewObsPos(frameTime);
      //障害物の中心を波源位置にする
      var sourceI = Math.round(NX * (obstacle.vPos.x + sizeX/2.0) / sizeX);
      var sourceJ = Math.round(NY * (obstacle.vPos.y + sizeY/2.0) / sizeY);
      pos[sourceI][sourceJ] = amp0 * Math.sin(2.0 * Math.PI * freq * elapseTime);
　　	
      var nSkip = 20;//時間刻みを小さくするため間引き表示
	  var dt = frameTime / nSkip;
	  for(var j = 0; j < nSkip; j++) calcDisp(dt);
	    
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
      
      display();
    }      
  }
  animate();
}
//--------------------------------------------
function initCamera()
{
　//光源インスタンスを作成
  light = new Light();
  light.pos[1] = 50;
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera(); 
  camera.dist = 15;
  camera.theta = 30;
  camera.cnt[2] = 0.0;
  camera.getPos();//カメラ位置を計算
  camera.delta = 1;
  mouseOperation(canvas, camera);//swgSupport.js
}

function initObstacle()
{
  //移動物体
  obstacle = new Rigid();//表示用、解析用同じ
  obstacle.kind = "SPHERE";
  obstacle.vPos.x = obsPos0.x;
  obstacle.vPos.y = obsPos0.y;
  obsRadius = Math.sqrt(obsPos0.x*obsPos0.x + obsPos0.y*obsPos0.y);
  obstacle.vSize = new Vector3(0.4, 0.4, 0.4);
  
}

function initData()
{  
  waveVel = parseFloat(form2.waveVel.value);
  lambda = parseFloat(form2.lambda.value);
  period = lambda / waveVel;
  freq = 1 / period;
  amp0 = parseFloat(form2.amp0.value);
  mu0 = parseFloat(form2.mu0.value);
  NX0 = parseInt(form2.nMesh.value);
  NY0 = NX0;
  DX = sizeX0 / NX0;
  DY = sizeY0 / NY0;
  
  w_object = new Rigid();//波を表示するオブジェクト
  w_object.kind = "ELEVATION";
  w_object.nSlice = NX0;
  w_object.nStack = NY0;
  w_object.sizeX = sizeX0;//ダミーを含まない領域のサイズ
  w_object.sizeY = sizeY0;
  w_object.diffuse = [ 0.4, 0.6, 0.9, 1.0] ;
  w_object.ambient = [ 0.1, 0.2, 0.3, 1.0];
  w_object.specular = [ 0.8, 0.8, 0.8, 1.0];
  w_object.shininess = 100.0;
  w_object.flagDebug = flagDebug;
  w_object.data = [];

  var i, j, k;
  
  //解析領域境界は常に無反射
  nDummy = 30;//最大で30
  NX = NX0 + 2 * nDummy;
  NY = NY0 + 2 * nDummy;
  sizeX = sizeX0 + 2.0 * DX * nDummy;
  sizeY = sizeY0 + 2.0 * DY * nDummy;

  initObstacle();

  //配列の2次元化
  for(i = 0; i <= NX; i++)
  {
    vel[i] = [];
    pos[i] = [];
//    type[i] = [];
  }
  //データをクリア,typeの決定
  for(var j = 0; j <= NY; j++)
    for(var i = 0; i <= NX; i++) 
    {
      //格子点速度・位置
      vel[i][j] = 0.0;
	  pos[i][j] = 0.0;

    } 

  flagStart = false;
}

function renewObsPos(dt)
{
  if(moveMode == "LINE")//直線モード
  { 
    obstacle.vVel.x = 0;
    if(obstacle.vVel.y > 0) obstacle.vVel.y = speed;
    else                    obstacle.vVel.y = -speed;
    if(obstacle.vPos.y >=  4) obstacle.vVel.y = -speed;
    if(obstacle.vPos.y <= -4) obstacle.vVel.y =  speed;
    obstacle.vPos.add(mul(obstacle.vVel, dt));  
  }
  else//円運動
  {//初期位置は左側
    var xx = -obstacle.vPos.x;//中心からの距離（左側で正）
    var yy =  obstacle.vPos.y;//中心からの距離（上側で正）
    obstacle.vVel.x = speed * yy / obsRadius;
    obstacle.vVel.y = speed * xx / obsRadius;
    obstacle.vPos.x = -obsRadius * Math.sin(speed * elapseTime / obsRadius);
    obstacle.vPos.y = -obsRadius * Math.cos(speed * elapseTime / obsRadius);
  }
}

//---------------------------------------------
function display()
{ 
  //光源
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  gl.uniform4fv(lightPosLoc, light.pos);
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightColLoc, light.color);
  
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //ビュープ投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  var colorLoc = gl.getUniformLocation(gl.program, 'u_colorMode');
  gl.uniform1i(colorLoc, colorMode);

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);
 
  //各頂点の座標
  w_object.data = [];
  var i, j;
  for(j = nDummy; j <= NY0 + nDummy; j++){
    for(i = nDummy; i <= NX0 + nDummy; i++){
      //if(type[i][j] == 1) pos[i][j] = 0;
      //var disp = pos[i][j] * (1 - type[i][j]);
      w_object.data.push(pos[i][j]);
    }
  }
  //水面
  var obstacleLoc = gl.getUniformLocation(gl.program, 'u_obstacle');
  gl.uniform1i(obstacleLoc, 0);//障害物でない
  var n = w_object.initVertexBuffers(gl);
  w_object.draw(gl, n);
  
  //移動障害物
  gl.uniform1i(obstacleLoc, 1);//障害物あり
  obstacle.flagDebug = flagDebug;
  n = obstacle.initVertexBuffers(gl);
  obstacle.draw(gl, n);

}

function calcDisp(dt)
{                        
  var i, j;
  var D = sizeX0 / NX0;//格子間隔(sizeX0=sizeY0,NX0=NY0であること）
  var D2 = D * D;
  var mu = mu0;
  var nm = nDummy;//無反射のときの有効領域境界番号	
  var np = NX0 + nDummy;
  var muMax = 5.0;
  var cc = waveVel * waveVel / D2;

  //格子点のｚ方向速度と位置の更新(Euler法)
  
  for(j = 1; j < NY; j++)
    for(i = 1; i < NX; i++)
    {
	  //解析領域境界は常に無反射境界とする
	  if(j < nm) mu = mu0 + muMax * (nm - j) / nDummy;
	  if(j > np) mu = mu0 + muMax * (j - np) / nDummy;
	  if(i < nm) mu = mu0 + muMax * (nm - i) / nDummy;
	  if(i > np) mu = mu0 + muMax * (i - np) / nDummy;

      //if(type[i][j] == 1) continue;
	  var accel = cc * (pos[i-1][j] + pos[i+1][j] + pos[i][j-1] + pos[i][j+1] - 4 * pos[i][j]);
	  //粘性抵抗
	  accel -= mu * vel[i][j];
      //速度
      vel[i][j] += accel * dt;
      //位置
      pos[i][j] += vel[i][j] * dt;
    }

}
//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}

function onChangeSpeed()
{
  speed = parseFloat(form2.speed.value);

}

function onChangeData()
{
  onClickReset();  
}

function onClickMode()
{
  var nn;
  var radioM = document.getElementsByName("radioM");
  for(var i = 0; i < radioM.length; i++)
  {
     if(radioM[i].checked) nn = i;
  }
  if(nn == 0)      mode = "SINGLE";
  else if(nn == 1) mode = "CONTINUOUS";
  
  onClickReset();  
}

function onChangeMoveMode()
{
  var nn;
  var radioMM = document.getElementsByName("radioMM");
  for(var i = 0; i < radioMM.length; i++)
  {
     if(radioMM[i].checked) nn = i;
  }
  if(nn == 0) moveMode = "LINE";
  else        moveMode = "CIRCLE";
  onClickReset();
}

function onClickDebug()
{
  if(form2.debug.checked) w_object.flagDebug = flagDebug = true;
  else                    w_object.flagDebug = flagDebug = false;
  display(); 
}

function onClickColor()
{
  if(form2.color.checked) colorMode = 1;
  else                    colorMode = 0;
  display(); 
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}

function onClickStart()
{
  fps = 0;
  elapseTime = elapseTime0;
  elapseTime0 = 0;
  elapseTime1 = 0;
  flagStart = true;
  flagStep = false;
  lastTime = new Date().getTime();
//count = 0;
}
function onClickFreeze()
{
  if(flagStart) { flagStart = false; }
  else { flagStart = true; elapseTime = elapseTime0; }
  flagStep = false;
}
function onClickStep()
{
  flagStep = true;
  flagStart = true;
  elapseTime = elapseTime0;
}
function onClickReset()
{
  elapseTime0 = 0;
  elapseTime = 0;
  flagStart = false;
  flagStep = false;
  initData();
  form1.time.value = "0";
  display();
}

function onClickCameraReset()
{
  initCamera();
  display();
}

function onClickCameraAbove()
{
  initCamera();
  camera.theta = 90.01;
  camera.getPos();//カメラ位置を計算
  display();
}

