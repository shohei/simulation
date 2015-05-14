/*----------------------------------------------
     advection.js
     移流方程式
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
var nMesh;//x軸方向分割数
var deltaX;//Δx(格子間隔)
var widthInit = 0.1;//パルス波形の初期幅
var centerInit = 0.05;//その中心点
var speed = 0.1;//波形の移流速度
var deltaT0 = 0.01;//数値計算上の時間刻み（初期設定値）
var deltaT;        //実際の数値計算上の時間刻み(delta0/thinningN)
var thinningN = 1; //間引き回数
var courant;
var method = 0;//1次精度
var nMethod = 4;//解法数(1次,2次,CIP,厳密解)

var f0 = [];//物理量（温度，濃度 etc.)計算前
var f1 = [];//物理量（温度，濃度 etc.)計算後
var g0 = [];//微分（CIP,計算前）
var g1 = [];//微分（CIP,計算後）
var f_t = [];//[4][NUM_MAX][10];//時系列データ
var time = [0.0, 2.0, 4.0, 6.0, 8.0];//その時刻[s]
var mark = [];
var nTime = 5;

var scale = new Vector3();
var count = 0;//厳密解を描画する際に，丁度格子間隔を通過したときだけデータを更新するためのカウンタ
var tt = 0;//厳密解を描画するときの経過時間
var hh = 0.25;//1つのプロファイルの表示枠の高さ

//表示領域矩形構造体
function Rect()
{
  this.scale = 1.8;//表示倍率
  this.nMesh = 100;//x方向割数（固定）
  this.size = new Vector3(1, 1, 0);//表示領域のサイズ（固定）
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
  form2.speed.value = speed;
  form2.scale.value = rect.scale;
   
  initData();

  gl.clear(gl.COLOR_BUFFER_BIT);
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
      elapseTime += deltaT;//数値計算上の経過時間（実経過時間ではない）
      if(method <= 2)//1次精度，2次精度, CIP
      {
        for(var i = 0; i < thinningN; i++) calculate(); 
      }
      else strictSolution();

      form1.time.value = elapseTime.toString();
    }
    display(); 
	if(method < 3) drawProfile();
	else drawStrict();

	drawTimeSeries();
      
    elapseTime0 = elapseTime;//現在の経過時間を保存
  }
  animate();
}

function initData()
{
  var i, j, k;
  var nWidth, nCenter;
  
  deltaT0 = parseFloat(form2.deltaT0.value);
  thinningN = parseInt(form2.thinningN.value);
  rect.nMesh = parseFloat(form2.nMesh.value);
  widthInit = parseFloat(form2.pulseWidth.value);
  centerInit = widthInit / 2;
  speed = parseFloat(form2.speed.value);
  rect.scale = parseFloat(form2.scale.value);
 
  nMesh = rect.nMesh;//空間分割数
  deltaX = rect.size.x / nMesh;//格子間隔
  nWidth = widthInit / deltaX;//パルス幅の格子数
  nCenter = centerInit / deltaX;
  
  deltaT = deltaT0 / thinningN;//数値計算上のタイムステップ
  form2.deltaT.value = deltaT;
  courant = speed * deltaT / deltaX;//クーラン数
  form2.Courant.value = courant;

  if(flagReset)
  {
    for(var k = 0; k < nTime; k++)
    {
      mark[k] = [];
      f_t[k] = [];
      for(j = 0; j < nMethod; j++) f_t[k][j] = [];
    }

  //時系列データのクリア
    for(k = 0; k < nTime; k++)
    {
      for(i = 0; i <= nMesh ; i++)
      {
        for(j = 0; j < 4; j++) 
        {
          f_t[k][j][i] = 0.0;
		  mark[k][j] = 0;//確定済みのとき1
		}
      }
	}
  }

  //初期値
  f0[0] = 0.0;
  for(i = 0; i <= nMesh; i++)
  {
    if(i <= nCenter - nWidth / 2)  f0[i] = 0.0;
    else if(i < nCenter + nWidth / 2) f0[i] = 1.0;
    else  f0[i] = 0.0;
    for(j = 0; j < 4; j++) f_t[0][j][i] = f1[i] = f0[i];//時系列データ
  }

  //微分の初期値(CIP法）
  for (i = 0; i <= nMesh; i++)
  {
	g0[i] = g1[i] = 0.0;
  }

  for(k = 0; k < nTime; k++)
  {
    for(j = 0; j < nMethod; j++)
      for(i = 0; i <= nMesh ; i++) mark[k][j] = 0;//確定済みのとき1
    
    time[k] = k / Math.abs(speed) / nTime;//speed=0.1のとき2s間隔
  }
	
  count = 0;
  flagReset = false;//Resetボタンが押されるまでリセットしない

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

  scale.x = rect.scale * s1;
  scale.y = rect.scale * s2;
  var sx = scale.x * rect.size.x / 2;//表示領域の幅は2*sx
  var sy = scale.y * rect.size.y / 2;//表示領域の高さは2*sy
  //表示領域全体
  drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
  
  //表示領域の左下基準点
  rect.left0.x = - sx;
  rect.left0.y = - sy;
	
  hh = rect.size.y / 4.0;//1つ当たりの表示枠の高さ
  var i;
  //各段の横軸
  for(i = 0; i <= 3; i++)
  {
    drawLine(rect.left0.x - 0.04 , rect.left0.y + i * hh * scale.y ,
      rect.left0.x + rect.size.x * scale.x, rect.left0.y + i * hh * scale.y, 1, "black");  
  }

  //横軸5分割線を縦軸に平行に引く（0.2間隔，2秒間隔）
  for(i = 1; i <= 4; i++)
  {
    drawLine(rect.left0.x + i * 0.2 * rect.size.x * scale.x, rect.left0.y,
		rect.left0.x + i * 0.2 * rect.size.x * scale.x, rect.left0.y + rect.size.y * scale.y, 1, "gray");
  }
  //縦軸目盛
  for(i = 0; i < 4; i++)
  {
	//f = 1
	drawLine(rect.left0.x, rect.left0.y + (i * hh + hh * 0.8) * scale.y,
		rect.left0.x - 0.04, rect.left0.y + (i * hh + hh * 0.8) * scale.y, 1, "black");
	//f = 0.5
	drawLine(rect.left0.x, rect.left0.y + (i * hh + hh * 0.4) * scale.y,
		rect.left0.x - 0.02, rect.left0.y + (i * hh + hh * 0.4) * scale.y, 1, "black");
  }
}

function calculate()
{
  var i, k, im1, im2, fm1, fm2;
  
  if(method <= 1)//1次精度，2次精度
  {	
	for(i = 0; i <= nMesh; i++)
	{
	  im1 = i-1;
	  if(im1 < 0) fm1 = 0.0; else fm1 = f0[im1];

	  if(method == 0)
      {
        //1次精度
        f1[i] = f0[i] + courant * (fm1 - f0[i]);
      }
      else if(method == 1) 
	  {
		im2 = i - 2; 
		if(im2 < 0) fm2 = 0.0; else fm2 = f0[im2];
		//2次精度
        f1[i] = f0[i] - 0.5 * courant * (fm2 - 4*fm1 + 3 *f0[i]);
      }
    }
	for(i = 0; i <= nMesh; i++) f0[i] = f1[i];//計算後のデータを次回の計算のために保存
  }
  else if(method == 2) methodCIP();//CIP

  //時系列データの保存
  for(k = 1; k < nTime; k++)
  {
	if(mark[k][method] == 1) continue;
	if(elapseTime >= time[k] / thinningN)
	{
	  for(i = 0; i <= nMesh; i++) f_t[k][method][i] = f0[i];
	  mark[k][method] = 1;
	} 
  }
}

function methodCIP()
{
  var i, ip;
  var Fp, Gp; 
  var c3, c2, x, s;

  if( speed > 0.0) s = 1.0;
  else s = -1.0;
  for(i = 0; i <= nMesh; i++)
  {
    ip = i-s;//上流点
    if(ip < 0.0 || ip > nMesh){
      Fp = 0.0;
	  Gp = 0.0;
	}
	else{ 
      Fp = f0[ip];
	  Gp = g0[ip];
	}

	var dx = -s * deltaX;
	var dx2 = dx * dx;
	var dx3 = dx2 * dx;

    c3 = (g0[i] + Gp) / dx2 + 2.0 * (f0[i] - Fp) / dx3;
	c2 = 3.0 * (Fp - f0[i]) / dx2 - (2.0 * g0[i] + Gp) / dx;
	x = - speed * deltaT;

	f1[i] += ( (c3 * x + c2) * x + g0[i] ) * x ;
	g1[i] += ( 3.0 * c3 * x + 2.0 * c2 ) * x ;	
  }
  for(i = 0; i <= nMesh; i++) { f0[i] = f1[i]; g0[i] = g1[i]; }

}

function strictSolution()
{
  var i, ip, k;
  //解析解(厳密解）		
  if(elapseTime >= count * deltaX / Math.abs(speed))
  {
	tt = 0.0;
	for(i = 0; i <= nMesh; i++)
    {
      ip = i-1;//上流点
	  
	  if(i == 0) f0[ip] = 0;
      f1[i] = f0[ip];
    }
    for(i = 0; i <= nMesh; i++) f0[i] = f1[i];

    count ++;
  }
  tt += deltaT0;//deltaT;

  //時系列データの保存
  for(k = 0; k < nTime; k++)
  {
	if(mark[k][3] == 1) continue;
	if(elapseTime >= time[k])
	{
	  for(var i = 0; i < nMesh; i++) {
        f_t[k][3][i] = f0[i+1];
	  }
	  mark[k][3] = 1;
    }
  }
}

function drawProfile()
{
  var HH;
  var data= [];
  var x1, y1, x2, y2;
  
  for(var i = 0; i < nMesh; i++)
  {
	HH = (3.0 - method) * hh;
	x1 = i* deltaX;
    y1 = HH + f0[i] * hh * 0.8;
	x2 = (i+1) * deltaX;
    y2 = HH + f0[i+1] * hh * 0.8;
    data.push(rect.left0.x + scale.x * x1);
	data.push(rect.left0.y + scale.y * y1);
	data.push(rect.left0.x + scale.x * x2);
	data.push(rect.left0.y + scale.y * y2);
  }
  drawLines(data, "black");  
}

function drawStrict()
{
  var data = [];
  var x1, y1, x2, y2;

  for(var i = 0; i < nMesh; i++)
  {
	x1 = i* deltaX + speed * tt;
    y1 = f0[i] * hh * 0.8,
	x2 = (i+1) * deltaX + speed * tt;
    y2 = f0[i+1] * hh * 0.8;
    data.push(rect.left0.x + scale.x * x1);
	data.push(rect.left0.y + scale.y * y1);
	data.push(rect.left0.x + scale.x * x2);
	data.push(rect.left0.y + scale.y * y2);
  }
  drawLines(data, "black");
}

function drawTimeSeries()
{
  var i, j, k;
  var x1, y1, x2, y2, HH;
  var data = [];

  for(k = 0; k < nTime; k++)
    for(j = 0; j < 4; j++){
	{
	  HH = (3.0 - j) * hh;
	  for(i = 0; i < nMesh; i++)
	  {
	    x1 = i * deltaX;
	    y1 = HH + f_t[k][j][i] * hh * 0.8;
	    x2 = (i+1) * deltaX;
	    y2 = HH + f_t[k][j][i+1] * hh * 0.8;
	    data.push(rect.left0.x + scale.x * x1);
		data.push(rect.left0.y + scale.y * y1);
		data.push(rect.left0.x + scale.x * x2);
		data.push(rect.left0.y + scale.y * y2);
	  }
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
  initData();
}

function onClickScale()
{
  rect.scale = parseFloat(form2.scale.value);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function onChangeMethod()
{
  var radioM =  document.getElementsByName("radioM");
  for(var i = 0; i < radioM.length; i++)
  {
     if(radioM[i].checked) method = i;
  }
  flagStart = false;
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
  initData();
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
  initData();
}



