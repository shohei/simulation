/*----------------------------------------------
     waveEquation1D1.js
     オイラー法による1次元波動方程式
     正弦波波源が存在する場合
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;     //WebGL描画用コンテキスト
//animation
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagFreeze = false;
var flagStep = false;
var flagReset = true;

//数値計算
var Length =10;// 10;//ダミーを含む計算領域の長さ（ｘ軸,[m]）
var Length0 =10;// 10;//ダミーを含まない計算領域の長さ
var NX = 200;//ダミーを含む分割数
var NX0 = 200;//ダミーを含まない
var nDummy0 = 30;
var nDummy = 0;
var DX = 0.1;//Δx(格子間隔)[m]
var sourceX0 = 0;  //波源位置（x軸中心が原点）
var nSourceX0 = 0; //その格子数
var lambda = 1;//波長[m]
var deltaT0 = 0.01;  //数値計算上の時間刻み（初期設定値）
var deltaT;          //実際の数値計算上の時間刻み(delta0/nSkip)
var nSkip = 1000; //間引き回数
var waveVel = 1; //伝搬速度[m/s]
var boundary = "B_FIXED"; 
var amp = 1.0;
var mu0 = 0;
var mode = "SINGLE";
var vel = [];//z軸方向速度
var pos = [];//変位量(ｚ軸の水面位置)

var scale = new Vector3();

//表示領域矩形構造体
function Rect()
{
  this.scale = 1.05;//表示倍率
  this.size = new Vector3(1.8, 1, 0);//領域のサイズ（固定）
  this.left0 = new Vector3(-0.5, -0.5, 0);//その左下位置(仮の値)
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
  
  form2.amp.value = amp;
  form2.deltaT0.value = deltaT0;
  form2.mu0.value = mu0;
  form2.nSkip.value = nSkip;
  form2.nMesh.value = NX;
  form2.lambda.value = lambda;
  form2.waveVel.value = waveVel;
  form2.scale.value = rect.scale;
  form2.sourceX0.value = sourceX0; 
  initData();

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
      elapseTime += deltaT0;//数値計算上の経過時間  
      var t = elapseTime;
      var n0 = NX/2 + nSourceX0;//左端からの波源格子点
      if(mode == "SINGLE")
	  {
	    if(elapseTime < period/2)
		pos[n0] = amp * Math.sin(2.0 * Math.PI * freq * t);
      }
	  else
	  {
	    pos[n0] = amp * Math.sin(2.0 * Math.PI * freq * t);
      }
      
      for(var i = 0; i < nSkip; i++) calcDisp(deltaT);
      
      form1.time.value = elapseTime.toString();
      elapseTime0 = elapseTime;//現在の経過時間を保存
      if(flagStep) { flagStart = false; } 
      display(); 
    }
  }
  animate();
}

function initData()
{
  var i, j, k;
  
  deltaT0 = parseFloat(form2.deltaT0.value);
  amp = parseFloat(form2.amp.value);
  mu0 = parseFloat(form2.mu0.value);
  nSkip = parseInt(form2.nSkip.value);
  sourceX0 = parseFloat(form2.sourceX0.value);//パルスの中心位置（x軸の中心が原点）
  lambda = parseFloat(form2.lambda.value);
  waveVel = parseFloat(form2.waveVel.value);
  period = lambda / waveVel;
  freq = 1 / period;
  rect.scale = parseFloat(form2.scale.value);

  NX0 = parseFloat(form2.nMesh.value);//空間分割数
  DX = Length0 / NX0;//格子間隔
  nSourceX0 = sourceX0 / DX;//パルスの中心位置の格子数（x軸の中心が原点）
  
  if(boundary == "B_NON") { nDummy = nDummy0; }
  else                    { nDummy = 0;  }
  
  NX = NX0 + 2 * nDummy; //全体の格子数

  deltaT = deltaT0 / nSkip;//数値計算上のタイムステップ
  form1.deltaT.value = deltaT;
  
  //初期値
  for (i = 0; i <= NX; i++)
  {
    vel[i] = 0;
    pos[i] = 0;
  }
}

function display()
{
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);
	
  scale.x = rect.scale;
  scale.y = 2*rect.scale;
  var sx = scale.x * rect.size.x / 2;//表示領域の幅は2*sx
  var sy = scale.y * rect.size.y / 2;//表示領域の高さは2*sy
  
  //表示領域の左下基準点
  rect.left0.x = - sx;
  rect.left0.y = - sy * 0.8;	
  
  var h0 = rect.size.y * 0.8;//変位量1に相当する高さはh0/4
  var i;

  //横軸5分割線を縦軸に平行に
  for(i = 0; i <= 3; i++)
  {
    drawLine(rect.left0.x + i * 0.5 * rect.size.x * scale.x, rect.left0.y,
		rect.left0.x + i * 0.5 * rect.size.x * scale.x, rect.left0.y + h0 * scale.y, 1, "light_blue");
  }

  //縦軸目盛
  for(i = 0; i <= 4; i++)
  {
	drawLine(rect.left0.x, rect.left0.y + (i * h0 * 0.25) * scale.y,
		rect.left0.x + rect.size.x * scale.x, rect.left0.y + (i * h0 * 0.25) * scale.y, 1, "light_blue");
  }
  
  drawProfile();

}

function calcDisp(dt)
{
  var i;
  var D2 = DX * DX;
  var mu = mu0;//減衰係数
  var muMax = 5;
  var nm = nDummy;//無反射のときの有効領域境界番号	
  var np = NX0 + nDummy;
  var im, ip, jm, jp;
  var zmi, zpi, zmj, zpj;
  var cc = waveVel * waveVel / D2;

  //格子点のｚ方向速度と位置の更新(Euler法)
  
  for(i = 0; i <= NX; i++)
  {

    if(boundary == "B_FIXED")
    {
      if(i == 0 && nSourceX0 != -NX/2) { pos[0] = 0; continue; }
      if(i == NX && nSourceX0 != NX/2) { pos[NX] = 0; continue; }
      if(i == 0 && nSourceX0 == -NX/2) { continue; }
      if(i == NX && nSourceX0 == NX/2) { continue; }
    }
    if(boundary == "B_FREE")
    {
      if(i == 0 && nSourceX0 != -NX/2) { pos[0] = pos[1]; continue; }
      if(i == NX && nSourceX0 != NX/2) { pos[NX] = pos[NX-1]; continue; }
      if(i == 0 && nSourceX0 == -NX/2) { continue; }
      if(i == NX && nSourceX0 == NX/2) { continue; }
    }

	if(boundary == "B_NON")
    {
	  if(i < nm) mu = mu0 + muMax * (nm - i) / nDummy;
	  else if(i > np) mu = mu0 + muMax * (i - np) / nDummy;
	  else mu = mu0;
    }

	if(i ==0 || i == NX) continue;
    //加速度
	var accel = cc * ((pos[i-1] + pos[i+1]) - 2 * pos[i]);
	accel -= mu * vel[i];//粘性抵抗 
    //速度
    vel[i] += accel * dt;
    //位置（変位量）
    pos[i] += vel[i] * dt;
  }
}

function drawProfile()
{
  var data = [];
  var x1, y1, x2, y2;
  var h0 = rect.size.y * 0.2;//関数値が1の高さ
  var dx = DX * rect.size.x / Length0;
  for(var i = 0; i < NX0; i++)
  {
	x1 = i* dx;
    y1 = (pos[i+nDummy] + 2) * h0 ;//値0が縦軸の中間になるように持ち上げる(x軸）
	x2 = (i+1) * dx;
    y2 = (pos[i+1+nDummy]+2) * h0;
    data.push(rect.left0.x + scale.x * x1);
	data.push(rect.left0.y + scale.y * y1);
	data.push(rect.left0.x + scale.x * x2);
	data.push(rect.left0.y + scale.y * y2);
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
  onClickReset();
}

function onClickScale()
{
  rect.scale = parseFloat(form2.scale.value);
  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}

function onChangeBoundary()
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
  flagReset = true;
  form1.time.value = "0";
  initData();
  display();
}

