/*----------------------------------------------
     advDiffusion1D.js
     1次元移流拡散方程式
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
var diffCoef = 0.0001;
var diffNumber;
var method = 0;//1次精度
var nMethod = 4;//解法数(風上差分,CIP,半陰解法,純陰解法）
var boundary = 0;//Dirichlet

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
      if(method == 0) upwind( courant, diffNumber ); 
      else if(method == 1) methodCIP(diffNumber);
	  else methodImplicit(courant, diffNumber);

      form1.time.value = elapseTime.toString();
    }
    display(); 
	drawProfile();
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
  pulsePos = parseFloat(form2.pulsePos.value);
  speed = parseFloat(form2.speed.value);
  rect.scale = parseFloat(form2.scale.value);
  diffCoef = parseFloat(form2.diffCoef.value);
 
  nMesh = rect.nMesh;//空間分割数
  deltaX = rect.size.x / nMesh;//格子間隔
  nWidth = widthInit / deltaX;//パルス幅の格子数
  nCenter = pulsePos / deltaX;
  
  deltaT = deltaT0 / thinningN;//数値計算上のタイムステップ
  form2.deltaT.value = deltaT;
  courant = speed * deltaT / deltaX;//クーラン数
  form2.Courant.value = courant;
  diffNumber = diffCoef * deltaT / (deltaX*deltaX);//拡散数
  form2.diffNumber.value = diffNumber;

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

function upwind(c, d)
{
  var im1 = 0, ip1 = 0, im2 = 0, ip2 = 0;
  var fm1 = 0.0, fp1 = 0.0, fm2 = 0.0, fp2 = 0.0;
  var i, k;

  for(i = 0 ; i <= nMesh; i++)
  {		
	if(boundary==0) { f0[0] = 0.0; f0[nMesh] = 0.0;}
	else if(boundary == 1) { f0[0] = f0[1]; f0[nMesh] = f0[nMesh-1];}
	
	im1 = i-1; ip1 = i+1;
	if(im1 < 0) fm1 = 0.0; else fm1 = f0[im1];
	if(ip1 > nMesh) fp1 = 0.0; else fp1 = f0[ip1];

	//時間に前進差分，空間の移流項に後退（上流）差分
	f1[i] = f0[i] + 0.5 * ( c * (fm1 - fp1) + Math.abs(c) * (fp1 + fm1 - 2.0 * f0[i]));
// f1[i] = f0[i] + c * (fm1 - f0[i]);
	//拡散
	f1[i] += d * (fm1 - 2.0 * f0[i] + fp1);
  }
  for(i = 0 ; i <= nMesh; i++) f0[i] = f1[i];//次のステップで使うデータ

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

function methodCIP(dif)
{
  var i, k;

  var ip, im;
  var Fp, Gp, fm1, fp1;
  var c3, c2, x;
  var s;

  if( speed > 0.0) s = 1.0;
  else s = -1.0;
  for(i = 1; i < nMesh; i++)
  {
	ip = i-s;//上流点
		
	if(ip < 0.0 || ip > nMesh)
    {
	  Fp = 0.0;
	  Gp = 0.0;
	}
	else
    { 
	  Fp = f0[ip];
	  Gp = g0[ip];
	}

	var dx = s * deltaX;
	var dx2 = dx * dx;
	var dx3 = dx2 * dx;

	c3 = (g0[i] + Gp) / dx2 - 2.0 * (f0[i] - Fp) / dx3;
	c2 = 3.0 * (Fp - f0[i]) / dx2 + (2.0 * g0[i] + Gp) / dx;
	x = - speed * deltaT;

	f1[i] = f0[i] + ( (c3 * x + c2) * x + g0[i] ) * x ;
	g1[i] = g0[i] + ( 3.0 * c3 * x + 2.0 * c2 ) * x ;	
		
	//拡散
	im = i-1; ip = i+1;
	if(im < 0.0) fm1 = 0.0; else fm1 = f0[im];
	if(ip > nMesh) fp1 = 0.0; else fp1 = f0[ip];
	f1[i] += dif * (fm1 - 2.0 * f0[i] + fp1);
		
	if(boundary == 0) { f1[0] = 0.0; f1[nMesh] = 0.0;}
	else if(boundary == 1) { f1[0] = f1[1]; f1[nMesh] = f1[nMesh-1];}

  }
  for(i = 0; i <= nMesh; i++) { f0[i] = f1[i]; g0[i] = g1[i]; }

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

function methodImplicit(c, d)
{
  var a = [], A, B, C;
  var im = 0, ip = 0;
  var fm1 = 0.0, fp1 = 0.0;
  var i, k;
  
  if(boundary==0) { f0[0] = 0.0; f0[nMesh] = 0.0;}//Dirichlet
  else if(boundary == 1) { f0[0] = f0[1]; f0[nMesh] = f0[nMesh-1];}//Neumann

  //1次風上差分
  if(method == 2)//半陰解法（Crank-Nicolson)
  {
	a[0] = -0.5 * ((c + Math.abs(c))/2.0 + d);
	a[1] = 1.0 + Math.abs(c)/2.0 + d;
	a[2] = 0.5 * ((c - Math.abs(c))/2.0 - d);
	A = 0.5 * ((c + Math.abs(c))/2.0 + d) ;
	B = 1.0 - Math.abs(c)/2.0 - d;
	C =  - 0.5 * ((c - Math.abs(c))/2.0 - d);
	f1[0] =  B * f0[0] + C * f0[1];
	f1[nMesh] = B * f0[nMesh] + A * f0[nMesh - 1];
		
	for(i = 0 ; i <= nMesh; i++) 
    {
	  im = i-1; ip = i+1;
	  if(im < 0) fm1 = 0.0; else fm1 = f0[im];
	  if(ip > nMesh) fp1 = 0.0; else fp1 = f0[ip];

	  f1[i] = A * fm1 + B * f0[i] + C * fp1;
	}
	Thomas(a, f1, nMesh, boundary);
	for(i = 0 ; i <= nMesh; i++) f0[i] = f1[i];
  }
  else if(method == 3)//純陰解法
  {
	a[0] = -(c + Math.abs(c)) / 2.0 - d;
	a[1] = 1.0 + Math.abs(c) + 2.0 * d;
	a[2] = (c- Math.abs(c)) / 2.0 - d;

	Thomas(a, f0, nMesh, boundary);
  }
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
function onChangeBoundary()
{
  var radioB =  document.getElementsByName("radioB");
  for(var i = 0; i < radioB.length; i++)
  {
     if(radioB[i].checked) boundary = i;
  }
  flagStart = false;
  initData();
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



