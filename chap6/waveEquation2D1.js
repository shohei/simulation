/*-----------------------------------------------
     waveEuation2D1.js
     2次元波動方程式の解
     カラーマップ表示を追加
------------------------------------------------*/
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera; //カメラ
var light;  //光源
var rigid;//表示オブジェクト
var flagDebug = false;
//animation
var fps ; //フレームレート
var lastTime;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;
//波
var NX0 = 50;//dummyを含まない有効領域分割数
var NY0 = 50;
var NX = 50;//dummyを含む分割数
var NY = 50;
var nDummy = 30;
var sizeX0 = 10; //dummyを含まない有効領域サイズ[m]
var sizeY0 = 10; //dummyを含む[m]
var sizeX = 10; //[m]
var sizeY = 10; //[m]
var period = 1;  //[s]
var freq = 1;    //[Hz]
var lambda = 1;  //[m]
var amp0 = 1;  //[m]
var waveVel = 1;//伝搬速度
var mu0 = 0.0;//粘性抵抗

var nSource = 1; //波源数
var sourceI = [];//波源座標
var sourceJ = [];
var sourceY0 = 0.0;//波源のy座標
var vel = []; //z軸方向の速度
var pos = []; //変位量

var mode = "SINGLE";//単発，連続
var boundary = "B_FIXED";
var w_object;//波全体を1個のオブジェクトで表示
var colorMode = 0;

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
      if(mode == "SINGLE")
	  {
	    for(var k = 0; k < nSource; k++)
		{
		  if(elapseTime < period)
		  pos[sourceI[k]][sourceJ[k]] = amp0 * Math.sin(2.0 * Math.PI * freq * elapseTime);
		}
      }
	  else
	  {
	    for(var k = 0; k < nSource; k++)
		{
		  pos[sourceI[k]][sourceJ[k]] = amp0 * Math.sin(2.0 * Math.PI * freq * elapseTime);
        }
      }
		
      var nSkip = 10;//時間刻みを小さくするため間引き表示
	  var tt = frameTime / nSkip;
	  for(var j = 0; j < nSkip; j++)
	  {
		calcDisp(tt);
	  }
      
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
  nSource = parseInt(form2.nSource.value);
  interval0 = parseFloat(form2.interval.value);//波源間隔
  sourceY0 = parseFloat(form2.Y0.value);//波源のｙ座標

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
  
  if(boundary == "B_NON")
  {
    nDummy = 30;//最大で30
	NX = NX0 + 2 * nDummy;
	NY = NY0 + 2 * nDummy;
	sizeX = sizeX0 + 2.0 * sizeX0 * nDummy / NX0;
	sizeY = sizeY0 + 2.0 * sizeY0 * nDummy / NY0;
  }
  else
  {
	nDummy = 0;
	NX = NX0;
	NY = NY0;
	sizeX = sizeX0;
	sizeY = sizeY0;
  }

  //配列の2次元化
  for(i = 0; i <= NX; i++)
  {
    vel[i] = [];
    pos[i] = [];
  }
  //データをクリア
  for(var j = 0; j <= NY; j++)
    for(var i = 0; i <= NX; i++) 
    {
      //格子点速度・位置
      vel[i][j] = 0.0;
	  pos[i][j] = 0.0;
    } 

  //波源の格子番号sourceI[],sourceJ[]を求める
  if(!form2.plane.checked)
  {
    var xs, ys;
    for(k = 0; k < nSource; k++)
    {//interval0:波源間隔
      xs = interval0 * (-0.5 * (nSource-1) + k);
      ys = sourceY0;
	  sourceI[k] = Math.round(NX * (xs + sizeX/2.0) / sizeX);
	  sourceJ[k] = Math.round(NY * (ys + sizeY/2.0) / sizeY);
    }
  }
  else
  {
    //平面波(x軸に平行な1列の格子点をすべて波源にする
    nSource = NX;
    for(k = 0; k < nSource; k++)
    {
      ys = sourceY0;
	  sourceI[k] = k;
	  sourceJ[k] = Math.round(NY * (ys + sizeY/2.0) / sizeY);
    }
  }
  
  flagStart = false;
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
  
  //ビュー投影行列を計算する
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
  for(j = nDummy; j <= NY0 + nDummy; j++){
    for(i = nDummy; i <= NX0 + nDummy; i++){
      w_object.data.push(pos[i][j]);
    }
  }
  var n = w_object.initVertexBuffers(gl);
  w_object.draw(gl, n);
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
  
  for(j = 0; j <= NY; j++) 
    for(i = 0; i <= NX; i++)
    {
      if(boundary == "B_FIXED")
      { 
        if(i == 0) pos[0][j] = 0; 
        if(i == NX) pos[NX][j] = 0; 
        if(j == 0)  pos[i][0] = 0;
        if(j == NY) pos[i][NY] = 0; 
      }
      else if(boundary == "B_FREE")
      {
        if(i == 0)  pos[0][j] = pos[1][j];
        if(i == NX) pos[NX][j] = pos[NX-1][j]; 
        if(j == 0)  pos[i][0] = pos[i][1];
        if(j == NY) pos[i][NY] = pos[i][NY-1];
	  }
	  else if(boundary == "B_NON")
      {
		if(j < nm) mu = mu0 + muMax * (nm - j) / nDummy;
		if(j > np) mu = mu0 + muMax * (j - np) / nDummy;
		if(i < nm) mu = mu0 + muMax * (nm - i) / nDummy;
		if(i > np) mu = mu0 + muMax * (i - np) / nDummy;
	  }

      if(i == 0 || i == NX|| j == 0 || j == NY) continue;
      
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

function onChangeData()
{
  onClickReset();  
//  initData();
}

function onClickBoundary()
{
  var nn;
  var radioB = document.getElementsByName("radioB");
  for(var i = 0; i < radioB.length; i++)
  {
     if(radioB[i].checked) nn = i;
  }
  if(nn == 0)      boundary = "B_FIXED";
  else if(nn == 1) boundary = "B_FREE";
  else if(nn == 2) boundary = "B_NON";
  
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

