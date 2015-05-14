/*----------------------------------------------
     diffusion1D.js
     1次元拡散方程式
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;     //WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//animation
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagFreeze = false;
var flagReset = true;

//数値計算
var flagConst = false;
var nMesh;//x軸方向分割数
var deltaX;//Δx(格子間隔)
var widthInit = 0.1;//パルス波形の初期幅
var centerInit = 0.05;//その中心点
var diffCoef = 0.001;//拡散係数
var deltaT0 = 0.01;  //数値計算上の時間刻み（初期設定値）
var deltaT;        //実際の数値計算上の時間刻み(delta0/thinningN)
var thinningN = 1; //間引き回数
var diffNumber;    //拡散数
var method = 0;  //explicit
var boundary = 0;//Dirichlet
var nMethod = 2; //解法数(explicit, inplicit)
var interval = 1;//時系列データ間隔(sec)
var f0 = [];//物理量（温度，濃度 etc.)計算前
var f1 = [];//物理量（温度，濃度 etc.)計算後
var f_t = [];//時系列データ
var time = [0, 1, 2, 3, 4, 5];//その時刻[s]
var mark = [];
var nTime = 6;

var scale = new Vector3();
var count = 0;//厳密解を描画する際に，丁度格子間隔を通過したときだけデータを更新するためのカウンタ
var tt = 0;//厳密解を描画するときの経過時間

//表示領域矩形構造体
function Rect()
{
  this.scale = 1.9;//表示倍率
  this.nMesh = 100;//x方向割数（固定）
  this.size = new Vector3(1, 1, 0);//領域のサイズ（固定）
  this.left0 = new Vector3(-0.5, -0.5, 0);//その左下位置
}
var rect = new Rect();

function webMain() 
{
  //canvas要素を取得する
  canvas = document.getElementById('WebGL');
  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) 
  {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }
  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  
  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE))
  {
    alert("GLSLの初期化に失敗");
    return;
  }
  
  //canvasをクリアする色を設定する
  gl.clearColor(1, 1, 1, 1);
  
  form2.deltaT0.value = deltaT0;
  form2.thinningN.value = thinningN;
  form2.nMesh.value = rect.nMesh;
  form2.pulseWidth.value = widthInit;
  form2.diffCoef.value = diffCoef;
  form2.scale.value = rect.scale;
  form2.interval.value = interval;
   
  init();

  display();  
    
  var fps = 0;//フレームレート
  var timestep = 0;
  var lastTime = new Date().getTime();
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
      form1.fps.value = 2*fps.toString(); //0.5秒間隔で表示
      timestep = 1 / (2*fps);
      form1.step.value = timestep.toString();
      fps = 0;
      elapseTime1 = 0.0;
    }
    lastTime = currentTime;　
    if(flagStart)
    {
      elapseTime += deltaT;//frameTime;//数値計算上の経過時間（実経過時間ではない）
        
      for(var i = 0; i < thinningN; i++) calculate(); 
      
      form1.time.value = elapseTime.toString();
    }
    display(); 
	drawProfile();
	drawTimeSeries();
     
    elapseTime0 = elapseTime;//現在の経過時間を保存
  }
  animate();
}

function init()
{
  var i, j, k;
  var nWidth, nCenter;
  
  deltaT0 = parseFloat(form2.deltaT0.value);
  thinningN = parseInt(form2.thinningN.value);
  rect.nMesh = parseFloat(form2.nMesh.value);
  widthInit = parseFloat(form2.pulseWidth.value);
  centerInit = 0.5;
  diffCoef = parseFloat(form2.diffCoef.value);
  rect.scale = parseFloat(form2.scale.value);
  interval = parseFloat(form2.interval.value);
  nMesh = rect.nMesh;//空間分割数
  deltaX = rect.size.x / nMesh;//格子間隔
  nWidth = widthInit / deltaX;//パルス幅の格子数
  nCenter = centerInit / deltaX;
  
  deltaT = deltaT0 / thinningN;//数値計算上のタイムステップ
  form2.deltaT.value = deltaT;
  diffNumber = diffCoef * deltaT / (deltaX*deltaX);//拡散数
  form2.diffNumber.value = diffNumber;
  flagConst = form2.Const.checked;

  for(k = 0; k < nTime; k++) f_t[k] = [];//2次元配列にする

  //初期値
  for (i = 0; i <= rect.nMesh; i++)
  {
    if(i < (rect.nMesh - nWidth) / 2) f0[i] = 0.0;
	else if( i > (rect.nMesh + nWidth) / 2) f0[i] = 0.0;
	else  f0[i] = 1.0;
		
 	f_t[0][i] = f1[i] = f0[i];//初期値（時系列データ）
  }
  for(k = 0; k < nTime; k++){
	mark[k] = 0;//確定済みのとき1
	time[k] = k * interval;
  }
  count = 0;
}

function display()
{
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  var s1, s2;
  if(canvas.width >= canvas.height) 
  {
    s1 = height_per_width;
    s2 = 1.0;
  }
  else
  {
    s1 = 1.0;
    s2 = 1 / height_per_width;
  }

  scale.x = 1.25 * rect.scale * s1;
  scale.y = rect.scale * s2;
  var sx = scale.x * rect.size.x / 2;//表示領域の幅は2*sx
  var sy = scale.y * rect.size.y / 2;//表示領域の高さは2*sy
  
  //表示領域の左下基準点
  rect.left0.x = - sx;
  rect.left0.y = - sy * 0.8;	
  
  var h0 = rect.size.y * 0.8;//関数値1に相当する高さ
  var i;

  //横軸5分割線を縦軸に平行に引く（0.2間隔）
  for(i = 0; i <= 5; i++)
  {
    drawLine(rect.left0.x + i * 0.2 * rect.size.x * scale.x, rect.left0.y,
		rect.left0.x + i * 0.2 * rect.size.x * scale.x, rect.left0.y + h0 * scale.y, 1, "light_blue");//"light_gray");
  }
  //縦軸目盛
  for(i = 0; i <= 5; i++)
  {
	//f = 1
	drawLine(rect.left0.x, rect.left0.y + (i * h0 * 0.2) * scale.y,
		rect.left0.x + rect.size.x * scale.x, rect.left0.y + (i * h0 * 0.2) * scale.y, 1, "light_blue");
  }
}

function calculate()
{
  var i, k;
  var fm1, fp1;
  nWidth = widthInit / deltaX;
	
  if(flagConst)//常に中心温度が1となるように設定
  {
	for (i = 0; i <= rect.nMesh; i++)
	{
	  if(i >= (rect.nMesh - nWidth) / 2 && i <= (rect.nMesh + nWidth) / 2) f0[i] = 1.0;
	}
  }

  if(method == 0)//陽解法
  {
    if(boundary == 0) //Dirichlet
    { 
      f0[0] = 0.0; f0[rect.nMesh] = 0.0;
	  for(i = 0; i <= rect.nMesh; i++)
	  {
	    if(i == 0) fm1 = 0; else fm1 = f0[i-1];
	    if(i == rect.nMesh) fp1 = 0; else fp1 = f0[i+1];
	    f1[i] = f0[i] + diffNumber * (fm1 - 2.0 * f0[i] + fp1);
	  }
    }
	else if(boundary == 1) //Neumann
    { 
      f0[0] = f0[1]; f0[rect.nMesh] = f0[rect.nMesh-1];
	  for(i = 0; i <= rect.nMesh; i++)
	  {
	    if(i == 0) fm1 = 0; else fm1 = f0[i-1];
	    if(i == rect.nMesh) fp1 = 0; else fp1 = f0[i+1];
	    f1[i] = f0[i] + diffNumber * (fm1 - 2.0 * f0[i] + fp1);
        f1[0] = f1[1]; f1[rect.nMesh] = f1[rect.nMesh-1];
	  }
    }
	for(i = 0; i <= rect.nMesh; i++) f0[i] = f1[i];
  }
  else//Thomas法
  {
	var d = diffNumber;
	var a = [-d, 1+2*d, -d];
			
	if(boundary == 0) 
    { 
      f0[0] = 0.0; 
      f0[rect.nMesh] = 0.0;
    }
	else if(boundary == 1) 
    { 
      f0[0] = f0[1]; 
      f0[rect.nMesh] = f0[rect.nMesh-1]; 
    }
	Thomas(a, f0, rect.nMesh, boundary);
  }

  //時系列データの保存
  for(k = 1; k < nTime; k++)
  {
	if(mark[k] == 1) continue;
	if(elapseTime >= time[k] / thinningN)
	{
	  for(i = 0; i <= nMesh; i++) f_t[k][i] = f0[i];
	  mark[k] = 1;
	} 
  }
}

function drawProfile()
{
  var data = [];
  var x1, y1, x2, y2;
  var h0 = rect.size.y * 0.8;//関数値が1の高さ
  
  for(var i = 0; i < nMesh; i++)
  {
	x1 = i* deltaX;
    y1 = f0[i] * h0;
	x2 = (i+1) * deltaX;
    y2 = f0[i+1] * h0;
    data.push(rect.left0.x + scale.x * x1);
	data.push(rect.left0.y + scale.y * y1);
	data.push(rect.left0.x + scale.x * x2);
	data.push(rect.left0.y + scale.y * y2);
  }
  drawLines(data, "black");  
}

function drawTimeSeries()
{
  var x1, y1, x2, y2;
  var data = [];
  var h0 = rect.size.y * 0.8;//関数値が1の高さ

  for(var k = 0; k < nTime; k++)
  {
    for(var i = 0; i < nMesh; i++)
    {
      x1 = i * deltaX;
	  y1 = f_t[k][i] * h0;
	  x2 = (i+1) * deltaX;
	  y2 = f_t[k][i+1] * h0;
	  data.push(rect.left0.x + scale.x * x1);
	  data.push(rect.left0.y + scale.y * y1);
	  data.push(rect.left0.x + scale.x * x2);
	  data.push(rect.left0.y + scale.y * y2);
	}
  }  
  drawLines(data, "black");
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
  flagReset = true;
  init();
}

function onClickScale()
{
  rect.scale = parseFloat(form2.scale.value);
  gl.clear(gl.COLOR_BUFFER_BIT);
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
  init();
}

function onChangeBoundary()
{
  var radioB =  document.getElementsByName("radioB");
  for(var i = 0; i < radioB.length; i++)
  {
     if(radioB[i].checked) boundary = i;
  }
  flagStart = false;
  init();
}
//-------------------------------------------------------------

function onClickStart()
{
  elapseTime = 0;
  elapseTime0 = 0;
  elapseTime1 = 0;
  flagStart = true;
  flagFreez = false;
  lastTime = new Date().getTime();
  init();
}

function onClickFreeze()
{
  if(flagStart) { flagStart = false; }
  else { flagStart = true; }
}

function onClickReset()
{
  elapseTime0 = 0;
  elapseTime = 0;
  flagStart = false;
  flagReset = true;
  form1.time.value = "0";
  init();
}

