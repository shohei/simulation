/*-----------------------------------------------
     diffusion2D1.js
     2次元拡散方程式
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
var object;
var adjustH = 0.5;//表示上の高さ調整
var colorMode = 0;//連続／段階表示
//数値計算
var flagConst = false;
var size = 1;//x,y軸方向サイズ（正方形）
var nMesh = 50;//x,y軸方向分割数
var delta;//Δx＝Δy(格子間隔)
var radius = 0.15;//初期分布の半径
var x0 = 0;//初期分布の中心（ワールド座標）
var y0 = 0;
var diffCoef = 0.001;//拡散係数
var deltaT0 = 0.01;//数値計算上の時間刻み（初期設定値）
var deltaT;        //実際の数値計算上の時間刻み(delta0/thinningN)
var thinningN = 1; //間引き回数
var diffNumber;  //拡散数
var method =  0; //解法
var profile = 0; //Cylinder
var boundary = 0;//Dirichlet
var f0 = [];

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
  
  //物理量を表現するオブジェクト
  object = new Rigid();
  object.kind  = "ELEVATION";
  object.sizeX = size;
  object.sizeY = size;
  object.vSize = new Vector3(1, 1, adjustH);  
  object.nSlice = object.nStack = nMesh;
  object.diffuse = [ 0.4, 0.6, 0.9, 1.0] ;
  object.ambient = [ 0.1, 0.2, 0.3, 1.0];
  object.specular = [ 0.8, 0.8, 0.8, 1.0];
  object.shininess = 100.0;
  //フロア
  floor0 = new Rigid();
  floor0.kind = "PLATE_Z";
  floor0.vPos = new Vector3(0.0, 0.0, -0.001);

  object.flagDebug = flagDebug;

  var i, j, k;
  
  deltaT = deltaT0 / thinningN;//数値計算上のタイムステップ
  form2.deltaT.value = deltaT;
  diffNumber = diffCoef * deltaT / (delta*delta);//拡散数
  form2.diffNumber.value = diffNumber;
  if(method == 0) { if(diffNumber > 0.25) alert("拡散数が0.25以上です") }
  flagConst = form2.Const.checked;

  var i, j, k;
  var x, y, r;
  
  //配列の2次元化
//  for(i = 0; i <= nMesh; i++) f0[i] = [];  
  
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
	    if(r < radius) object.data[k] = f0[k] = 1.0;//物理量
	    else object.data[k] = f0[k] = 0.0;
	  }
	  else//Cube
	  {
	    if(Math.abs(x) < radius && Math.abs(y) < radius) object.data[k] = f0[k] = 1.0;
	    else object.data[k] = f0[k] = 0.0;
	  }
    }
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
  var i, j, k;
	
  var x, y, r;
  var fim, fip, fjm, fjp;
  var kim, kip, kjm, kjp;
  
  if(flagConst)
  {
    for(j = 0; j <= nMesh; j++)
    for(i = 0; i <= nMesh; i++)
    {
	  k = i + j * (nMesh + 1);
	  //分布中心からの距離
	  x = (i - nMesh / 2) * delta - x0;
	  y = (j - nMesh / 2) * delta - y0;
	  if(profile == 0)//Cylinder
	  {
 	    r = Math.sqrt(x * x + y * y);
	    if(r < radius) object.data[k] = f0[k] = 1.0;//物理量
	  }
	  else//Cube
	  {
	    if(Math.abs(x) < radius && Math.abs(y) < radius) object.data[k] = f0[k] = 1.0;
	  }
    }
  }

  if(method == 0)//陽解法
  {
    if(boundary == 0) //Dirichlet
    {
      for(j = 1; j < nMesh; j++)
      for(i = 1; i < nMesh; i++)
      {
	    k = i + j * (nMesh + 1);
	    kim = i-1 + j*(nMesh+1); kip = i+1 + j*(nMesh+1);
	    kjm = i + (j-1)*(nMesh+1); kjp = i + (j+1)*(nMesh+1);

        fim = f0[kim]; if(i == 1) fim = 0;
        fip = f0[kip]; if(i == nMesh-1) fip = 0;
        fjm = f0[kjm]; if(j == 1) fjm = 0;
        fjp = f0[kjp]; if(j == nMesh-1) fjp = 0;
        
        object.data[k] = f0[k] + diffNumber * (fim + fip + fjm + fjp - 4 * f0[k]) ;
	  }
    }
    else//Neumann
    {
      for(j = 1; j < nMesh; j++)
      for(i = 1; i < nMesh; i++)
      {
	    k = i + j * (nMesh + 1);
	    kim = i-1 + j*(nMesh+1);   kip = i+1 + j*(nMesh+1);
	    kjm = i + (j-1)*(nMesh+1); kjp = i + (j+1)*(nMesh+1);
    
        fim = f0[kim]; if(i == 1) fim = object.data[kim] = f0[i + j*(nMesh+1)];
        fip = f0[kip]; if(i == nMesh-1) fip = object.data[kip] = f0[i + j*(nMesh+1)];
        fjm = f0[kjm]; if(j == 1) fjm = object.data[kjm] = f0[i + j*(nMesh+1)];
        fjp = f0[kjp]; if(j == nMesh-1) fjp = object.data[kjp] = f0[i + j*(nMesh+1)];
       
        object.data[k] = f0[k]  + diffNumber * (fim + fip + fjm + fjp - 4 * f0[k]);
        
	  }
	  //4隅
	  object.data[0] = f0[1 + (nMesh+1)]; 
      object.data[nMesh] = f0[nMesh-1 + nMesh+1];
	  object.data[nMesh*(nMesh+1)] = f0[1 + (nMesh-1)*(nMesh+1)]; 
      object.data[nMesh+nMesh*(nMesh+1)] = f0[nMesh-1 + (nMesh-1)*(nMesh+1)];
    }
  }

  else//Thomas法
  {
	var d = diffNumber;
	var a = [-d, 1+2*d, -d];
	
	var f1 = [];
	var f2 = [];
	for(j = 0; j <= nMesh; j++)
    {		
      for(i = 0; i <= nMesh; i++)
      {
	    k = i + j * (nMesh + 1);
	    f1[i] = f0[k];
	    if(boundary == 0) 
        { 
          f1[0] = 0.0; 
          f1[nMesh] = 0.0;
        }
      }
	  Thomas(a, f1, nMesh, boundary);
	  for(i = 0; i <= nMesh; i++)
      {
        k = i + j * (nMesh + 1); 
        f2[k] = f1[i];
      }
	}
	
	for(i = 0; i <= nMesh; i++)
    {		
      for(j = 0; j <= nMesh; j++)
      {
	    k = i + j * (nMesh + 1);
	    f1[j] = f2[k];
	    if(boundary == 0) 
        { 
          f1[0] = 0.0; 
          f1[nMesh] = 0.0;
        }
      }
	  Thomas(a, f1, nMesh, boundary);
	  for(j = 0; j <= nMesh; j++)
      {
        k = i + j * (nMesh + 1); 
        object.data[k] = f1[j];
      }
	}
  }

  //計算結果をf0[]へ
  for(j = 0; j <= nMesh; j++)
    for(i = 0; i <= nMesh; i++)
    {
	  k = i + j * (nMesh + 1);
	  f0[k] = object.data[k];
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
  flagStart = false;
  initData();
}
function onChangeAdjustH()
{
  adjustH = parseFloat(form2.adjustH.value);
  if(adjustH == 0) adjustH = 0.001;//　完全に0にするとmatrix4の逆行列ルーチンでエラーになる
  display();
}

function onChangeMethod()
{
  var radioM =  document.getElementsByName("radioM");
  for(var i = 0; i < radioM.length; i++)
  {
     if(radioM[i].checked) method = i;
  }
  flagStart = false;
  initData();
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
  flagStart = false;
//  initData();
}

function onClickDebug()
{
  if(form2.debug.checked) object.flagDebug = flagDebug = true;
  else                    object.flagDebug = flagDebug = false;
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
