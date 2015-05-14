/*-----------------------------------------------
     advDiffusion2D.js
     2次元移流拡散方程式
------------------------------------------------*/
var canvas;//canvas要素
var gl;    //WebGL描画用コンテキスト
var camera;//カメラ
var light; //光源
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
//表示オブジェクト
var object, floor0;
var adjustH = 0.5;//表示上の高さ調整
var colorMode = 0;//連続／段階表示
//数値計算
var flagConst = false;
var flagRotation = false;
var size = 1;//x,y軸方向サイズ（正方形）
var nMesh = 50;//x,y軸方向分割数
var delta;//Δx＝Δy(格子間隔)
var radius = 0.1;//初期分布の半径
var x0 = 0;//初期分布の中心（ワールド座標）
var y0 = -0.3;//[m]
var speedX = 0;  //[m/s]
var speedY = 0.1;//[m/s]
var speedR = 0.1;//回転時の比例速度
var diffCoef = 0.001;//拡散係数[m^2/s]
var deltaT0 = 0.01;//数値計算上の時間刻み（初期設定値）
var deltaT;        //実際の数値計算上の時間刻み(delta0/thinningN)
var thinningN = 1; //間引き回数
var diffNumber;  //拡散数
var profile = 0; //Cylinder
var boundary = 0;//Dirichlet
var f0 = [];//物理量（温度，濃度 etc.)計算前
var f1 = [];//物理量（温度，濃度 etc.)計算後
var g0X = [];//微分（CIP,計算前）
var g1X = [];//微分（CIP,計算後）
var g0Y = [];//微分（CIP,計算前）
var g1Y = [];//微分（CIP,計算後）
var velX = [];//速度分布
var velY = [];

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
  
  form2.deltaT0.value = deltaT0;
  form2.thinningN.value = thinningN;
  form2.nMesh.value = nMesh;
  form2.radius.value = radius;
  form2.diffCoef.value = diffCoef;
  form2.adjustH.value = adjustH;
  form2.x0.value = x0;
  form2.y0.value = y0;
  form2.vx.value = speedX;
  form2.vy.value = speedY;
  form2.vr.value = speedR;
  
  initCamera();
  initData();
  display();
 
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
      var timestep = 1 / (2*fps);
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;　
    if(flagStart)
    { 
      elapseTime += deltaT;//数値計算上の経過時間（実経過時間ではない）
        
      for(var i = 0; i < thinningN; i++) calculate(); 
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
    display();
  }
  animate();
}
//--------------------------------------------
function initCamera()
{
　//光源インスタンスを作成
  light = new Light();
  
　//カメラ・インスタンスを作成
  camera = new Camera(); 
  camera.cnt[2] = 0.2;
  camera.dist = 4;
  camera.fovy = 15;
  camera.getPos();//カメラ位置を計算
  mouseOperation(canvas, camera);//swgSupport.js
}

function initData()
{  
  deltaT0 = parseFloat(form2.deltaT0.value);
  thinningN = parseInt(form2.thinningN.value);
  radius = parseFloat(form2.radius.value);
  diffCoef = parseFloat(form2.diffCoef.value);
  nMesh = parseInt(form2.nMesh.value);//空間分割数
  delta = size / nMesh;//格子間隔
  x0 = parseFloat(form2.x0.value);
  y0 = parseFloat(form2.y0.value);
  flagRotation = form2.Rotation.checked;
  speedX = parseFloat(form2.vx.value);
  speedY = parseFloat(form2.vy.value);
  speedR = parseFloat(form2.vr.value);

  object = new Rigid();//Rigidクラスのオブジェクトを表示オブジェクト
  object.kind  = "ELEVATION";
  object.sizeX = size;
  object.sizeY = size;
  object.vSize = new Vector3(1, 1, adjustH);//scaling  
  object.nSlice = object.nStack = nMesh;
  object.diffuse = [ 0.4, 0.6, 0.9, 1.0] ;
  object.ambient = [ 0.1, 0.2, 0.3, 1.0];
  object.specular = [ 0.8, 0.8, 0.8, 1.0];
  object.shininess = 100.0;
  object.flagDebug = flagDebug;
  //フロア
  floor0 = new Rigid();
  floor0.kind = "PLATE_Z";
  floor0.vPos = new Vector3(0.0, 0.0, -0.001);


  var i, j, k;
  
  deltaT = deltaT0 / thinningN;//数値計算上のタイムステップ
  form2.deltaT.value = deltaT;
  diffNumber = diffCoef * deltaT / (delta*delta);//拡散数
  form2.diffNumber.value = diffNumber;
  if(diffNumber > 0.25) alert("拡散数が0.25以上です") 
  flagConst = form2.Const.checked;

  var i, j, k;
  var x, y, r;  
  
  maxSpeed = 0;
  for(j = 0; j <= nMesh; j++)
  {
    for(i = 0; i <= nMesh; i++)
    {
	  k = i + j * (nMesh + 1);
	  //物理量分布中心からの距離
	  x = (i - nMesh / 2) * delta - x0;
	  y = (j - nMesh / 2) * delta - y0;
	  if(profile == 0)//Cylinder
	  {
 	    r = Math.sqrt(x * x + y * y);
	    if(r < radius) object.data[k] = f1[k] = f0[k] = 1.0;//物理量
	    else object.data[k] = f1[k] = f0[k] = 0.0;
	  }
	  else//Cube
	  {
	    if(Math.abs(x) < radius && Math.abs(y) < radius) object.data[k] = f1[k] = f0[k] = 1.0;
	    else object.data[k] = f1[k] = f0[k] = 0.0;
	  }
	  //微分の初期値(CIP法）
	  g0X[k] = g1X[k] = g0Y[k] = g1Y[k] = 0.0;
//alert(" flagRotation = " + flagRotation + " vr = " + speedR);
   
      //速度分布
      if(flagRotation)
      {
	    //矩形中心からの距離
		x = (i - nMesh/2) * delta ;
		y = (j - nMesh/2) * delta ;
		velX[k] = speedR * y; //速度x成分(時計回り）
		velY[k] = -speedR * x;//速度y成分
		speed = speedR * Math.sqrt(x*x + y*y);//半径に比例した速度
		if(speed > maxSpeed) maxSpeed = speed;
//if(j == 10) console.log(" i = " + i + " vx = " + velX[k] + " vy = " + velY[k]);
　　　}
　　　else//直進走行
　　　{
        velX[k] = speedX;//速度x成分
        velY[k] = speedY;//速度y成分     
      }
    }
  }
  if(!flagRotation)  maxSpeed = Math.sqrt(speedX*speedX + speedY*speedY);
  Courant = maxSpeed * deltaT / delta;
  form2.Courant.value = Courant;
}

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
 
  object.vSize = new Vector3(1, 1, adjustH);  
  var n = object.initVertexBuffers(gl);
  object.draw(gl, n);

  //floor
  gl.uniform1i(colorLoc, 2);
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

}

function calculate()
{
  var deltaX = size / nMesh;
  var deltaY = deltaX;
	
  var kim, kip, kjm, kjp;
  var fim, fip, fjm, fjp;//隣接格子点の物理量
  var i, j, k;
  
  if(flagConst)
  {
    for(j = 0; j <= nMesh; j++)
    for(i = 0; i <= nMesh; i++)
    {
	  k = i + j * (nMesh + 1);
	  //物理量分布中心からの距離
	  x = (i - nMesh / 2) * delta - x0;
	  y = (j - nMesh / 2) * delta - y0;
	  if(profile == 0)//Cylinder
	  {
 	    r = Math.sqrt(x * x + y * y);
	    if(r < radius) object.data[k] = f1[k] = f0[k] = 1.0;//物理量
	  }
	  else//Cube
	  {
	    if(Math.abs(x) < radius && Math.abs(y) < radius) object.data[k] = f1[k] = f0[k] = 1.0;
	  }
    }
  }
  
  for(j = 1; j < nMesh; j++)
  {
    for(i = 1; i < nMesh; i++)
    {
      k = i + j * (nMesh + 1);
	  kim = i-1 + j*(nMesh+1);   kip = i+1 + j*(nMesh+1);
      kjm = i + (j-1)*(nMesh+1); kjp = i + (j+1)*(nMesh+1);
      if(boundary == 0)//Direchlet
      {
        fim = f0[kim]; if(i == 1) fim = 0;
        fip = f0[kip]; if(i == nMesh-1) fip = 0;
        fjm = f0[kjm]; if(j == 1) fjm = 0;
        fjp = f0[kjp]; if(j == nMesh-1) fjp = 0;
      }
	  else if(boundary == 1)//Neumann
	  {
        fim = f0[kim]; if(i == 1) fim = f0[i + j*(nMesh+1)];
        fip = f0[kip]; if(i == nMesh-1) fip = f0[i + j*(nMesh+1)];
        fjm = f0[kjm]; if(j == 1) fjm = f0[i + j*(nMesh+1)];
        fjp = f0[kjp]; if(j == nMesh-1) fjp = f0[i + j*(nMesh+1)];
	  }
		
	  methodCIP(i, j, k);
				
	  //拡散
	  f1[k] += diffNumber * (fim + fip + fjm + fjp - 4.0 * f0[k]);
	  
      if(boundary == 1)
      {
        f1[0+j*(nMesh+1)] = f1[1+j*(nMesh+1)]; f1[nMesh+j*(nMesh+1)] = f1[nMesh-1+j*(nMesh+1)];
        f1[i] = f1[i+(nMesh+1)]; f1[i+nMesh*(nMesh+1)] = f1[i+(nMesh-1)*(nMesh+1)];
      }
	}
  
    if(boundary == 1)
    {
 	  //4隅
	  f1[0] = f1[1 + (nMesh+1)]; 
      f1[nMesh] = f1[nMesh-1 + nMesh+1];
	  f1[nMesh*(nMesh+1)] = f1[1 + (nMesh-1)*(nMesh+1)]; 
      f1[nMesh+nMesh*(nMesh+1)] = f1[nMesh-1 + (nMesh-1)*(nMesh+1)];
    }
  }
  //計算結果をf0, g0X, g0Yへ
  for(j = 0; j <= nMesh; j++)
    for(i = 0; i <= nMesh; i++)
    {
	  k = i + j * (nMesh + 1);
	  f0[k] = object.data[k] = f1[k];
	  g0X[k] = g1X[k];
	  g0Y[k] = g1Y[k];
    }
}

function methodCIP(i, j, k)
{
  var c11, c12, c21, c02, c30, c20, c03, a, b, sx, sy, x, y, dx, dy;
  var f, gx, gy, fip, fjp, gxip, gxjp, gyip, gyjp, fpp; 
  var kpp;
  	       
  
  f = f0[k]; gx = g0X[k]; gy = g0Y[k];

  if(velX[k] > 0.0) sx = 1.0; else sx = -1.0;
  if(velY[k] > 0.0) sy = 1.0; else sy = -1.0;
	
  ip = - sx;
  jp = - sy;
  //上流点
  var kip = i+ip + j * (nMesh+1)  ; kim = i-ip + j * (nMesh+1)
  var kjp = i + (j+jp) * (nMesh+1); kjm = i + (j-jp) * (nMesh+1)
  var kpp = i+ip + (j+jp) * (nMesh+1);
　//微小移動分
  x = - velX[k] * deltaT;
  y = - velY[k] * deltaT;
  dx =  sx * delta;
  dy =  sy * delta;

  //係数
  c30 = ((g0X[kip] + gx) * dx - 2.0 * (f - f0[kip])) / (dx*dx*dx);
  c20 = (3.0 * (f0[kip] - f) + (g0X[kip] + 2.0 * gx) * dx) / (dx * dx);
  c03 = ((g0Y[kjp] + gy) * dy - 2.0 * (f - f0[kjp])) / (dy*dy*dy);
  c02 = (3.0 * (f0[kjp] - f) + (g0Y[kjp] + 2.0 * gy) * dy) / (dy * dy);
  a = f - f0[kjp] - f0[kip] + f0[kpp];
  b = g0Y[kip] - gy;
  c12 = (-a - b * dy) / (dx * dy * dy);
  c21 = (-a - (g0X[kjp] - gx) * dx) / (dx*dx*dy);
  c11 = - b / dx + c21 * dx;

  //更新
  f1[k] += ((c30 * x + c21 * y + c20) * x + c11 * y + gx) * x
          + ((c03 * y + c12 * x + c02) * y + gy) * y;
  g1X[k] += (3.0 * c30 * x + 2.0 * (c21 * y + c20)) * x + (c12 * y + c11) * y;
  g1Y[k] += (3.0 * c03 * y + 2.0 * (c12 * x + c02)) * y + (c21 * x + c11) * x;
	
  //非移流項
  f1[k]  += -f * deltaT * 0.5 * ((velX[kip] - velX[kim]) / Math.abs(dx) + (velY[kjp] - velY[kjm]) / Math.abs(dy));
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
  flagStart = false;
  initData();
}
function onChangeAdjustH()
{
  adjustH = parseFloat(form2.adjustH.value);
  if(adjustH == 0) adjustH = 0.001;//　完全に0にするとmatrix4の逆行列ルーチンでエラーになる
  display();
}


function onChangeProfile()
{
  var nn;
  var radioP = document.getElementsByName("radioP");
  for(var i = 0; i < radioP.length; i++)
  {
     if(radioP[i].checked) profile = i;
  }
  flagStart = false;
  initData();
}

function onChangeBoundary()
{
  var nn;
  var radioB = document.getElementsByName("radioB");
  for(var i = 0; i < radioB.length; i++)
  {
     if(radioB[i].checked) boundary = i;
  }
  flagStart = false;
  initData();
}

function onChangeColorMode()
{
  var nn;
  var radioC = document.getElementsByName("radioC");
  for(var i = 0; i < radioC.length; i++)
  {
     if(radioC[i].checked) colorMode = i;
  }
  display();
}

function onClickDebug()
{
  object.flagDebug = flagDebug = !flagDebug;
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
  elapseTime = 0;
  elapseTime0 = 0;
  elapseTime1 = 0;
  flagStart = true;
  flagStep = false;
  lastTime = new Date().getTime();
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
