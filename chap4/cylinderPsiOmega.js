/*----------------------------------------------
     cylinderPsiOmega.js
     極座標変換による円柱周りの流れ
     流れ関数-渦度法
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//animation
var fps ; //フレームレート
var lastTime;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var elapseTimeN = 0.0;//無次元時間
var elapseTimeN0 = 0.0;
var flagStart = false;
var flagStep = false;
var flagReset = false;

//数値計算
var Psi = [];  //流れ関数
var Omg = [];//渦度
var gx = [];   //ｘ方向微分
var gy = [];   //ｙ方向微分
var VelX = []; //ｘ方向速度
var VelY = []; //ｙ方向速度
var PosX = []; //格子点位置
var PosY = [];
var type = [];//格子点のタイプ
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagStream = true;
var flagVorticity = true;
var flagVelocity = false;
var flagGrid = false;
var nLine = 30;//流線,ポテンシャルの表示本数
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

var deltaT = 0.02;
var Re = 500.0;//レイノルズ数

var maxPsi = 8.0;
var minPsi = -8.0;
var maxOmg = 5.0;
var minOmg = -6.0;

function Region()
{
  this.scale = 1.7;//表示倍率
  this.pos0 = new Vector3(-0.2, 0, 0);
  this.Radius = 30;//領域全体の半径
  this.nMeshX = 30;//動径方向分割数
  this.nMeshY = 60;//動径方向分割数
}
var region = new Region();
var NX, NY, DX, DY;

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
  form1.deltaT.value = deltaT;
  form1.Re.value = Re;
  form1.nMeshX.value = region.nMeshX;
  form1.nMeshY.value = region.nMeshY;
  form2.x0.value = region.pos0.x;
  form2.scale.value = region.scale;
  form2.nLine.value = nLine;
  form2.psi.checked = flagStream;
  form2.omega.checked = flagVorticity;
  form2.velocity.checked = flagVelocity;
  form2.maxPsi.value = maxPsi;
  form2.minPsi.value = minPsi;
  form2.maxOmg.value = maxOmg;
  form2.minOmg.value = minOmg;
  
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
      elapseTime += frameTime;
      elapseTimeN += deltaT;//数値計算上の経過時間（無次元時間）
        
      calculate(); 
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      elapseTimeN0 = elapseTimeN;//現在の経過時間を保存
      
      form1.e_time.value = elapseTime.toString();
      form1.n_time.value = elapseTimeN.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
    display();
  }
  animate();

}

function initData()
{
  deltaT = parseFloat(form1.deltaT.value);
  Re = parseFloat(form1.Re.value);
  NX = region.nMeshX = parseInt(form1.nMeshX.value);//動径方向分割数
  NY = region.nMeshY = parseInt(form1.nMeshY.value);//方位方向角分割数

  for(i = 0; i <= NX; i++)
  {//配列の2次元化
    Psi[i] = [];  //流れ関数
    Omg[i] = [];//渦度
    gx[i] = [];   //ｘ方向微分
    gy[i] = [];   //ｙ方向微分
    VelX[i] = []; //ｘ方向速度
    VelY[i] = []; //ｙ方向速度
    PosX[i] = [];
    PosY[i] = [];
  }  

  //円柱の半径は1に固定
  var xiMax = Math.log(region.Radius);//計算面における外側半径(円柱半径は1.0に固定）
  DX = xiMax / NX;//動径方向刻み
  DY = 2.0 * Math.PI / NY; //方位角方向刻み

  var i, j;
  //初期条件
  for(j = 0; j <= NY; j++)
	for (i = 0; i <= NX; i++)
	{
	  //流れ関数
	  if(i == 0) Psi[i][j] = 0;
	  else
	    Psi[i][j] = Math.exp(i * DX) * Math.sin(j * DY - Math.PI);//分岐線を負のｘ軸としている
	  //渦度
	  Omg[i][j] = 0.0;
	  gx[i][j] = 0.0;
	  gy[i][j] = 0.0;
	}

  //格子点の速度ベクトル(上下左右の流れ関数の差で求める)
  calcVelocity();

  //格子点座標（あらかじめ計算）
  var r, theta;
  for (i = 0; i <= NX; i++)
  {
    r = Math.exp(i * DX);
	for (j = 0; j <= NY; j++)
    {
	  theta = j * DY - Math.PI; //分岐線は左側

	  PosX[i][j] = r * Math.cos(theta);//実空間
	  PosY[i][j] = r * Math.sin(theta);
	}
  }

  calcVelocity();

  maxPsi0 = -1000.0; minPsi0 = 1000.0;
  maxOmg0 = -1000.0; minOmg0 = 1000.0;

  //発散しないための目安を知るため
  var courant, diffNum;
  if(DX < DY)
  {
    courant = 1.0 * deltaT / DX;	
	diffNum = (1.0 / Re) * deltaT / (DX * DX);//拡散数
  }
  else
  {
 	courant = 1.0 * deltaT / DY;	
	diffNum = (1.0 / Re) * deltaT / (DX * DY);//拡散数
  }
  form1.courant.value = courant;
  form1.diffNum.value = diffNum;
}

function display()
{
  flagStream = form2.psi.checked;
  flagVorticity = form2.omega.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
  region.pos0.x = parseFloat(form2.x0.value);
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  //計算領域パラメータ
  var s1, s2;
  if(canvas.width >= canvas.height) 
  {
    s1 = height_per_width;
	s2 = 1.0;
  }
  else
  {
    s1 = 1.0;
	s2 = 1.0 / height_per_width;
  }

  scale.x = 2.0 * region.scale * s1 / region.Radius * 0.8;// 100.0;//R=100が1程度になるように全体表示
  scale.y = 2.0 * region.scale * s2 / region.Radius * 0.8;//100.0;
  var x0 = region.pos0.x;
  var y0 = region.pos0.y;
  //円柱断面表示
  drawCircle(x0, y0, 2*scale.x, 2*scale.y, true, "gray", 0)

　//流線、等渦度線、圧力表示
  maxPsi = parseFloat(form2.maxPsi.value);
  minPsi = parseFloat(form2.minPsi.value);
  maxOmg = parseFloat(form2.maxOmg.value);
  minOmg = parseFloat(form2.minOmg.value);
  if( flagStream ) drawContour(Psi, minPsi, maxPsi, "red");
  if( flagVorticity ) drawContour(Omg, minOmg, maxOmg, "blue");
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
   
}

function calculate()
{
  var i, j;
  var iteration = 10;//最大繰り返し回数(Poisson方程式）
  var tolerance = 0.0001;//許容誤差
  var error = 0.0;
  var maxError = 0.0;	
  var i, j;
  var pp, ex2;
  var DX2 = DX * DX;
  var DY2 = DY * DY;
  var DXi2 = 1.0 / DX2;
  var DYi2 = 1.0 / DY2;
  var fct = 1.0 / (2.0 * DX2 + 2.0 * DY2);

  //境界条件
  for (j = 0; j < NY; j++) 
  {
    //円柱上
    Omg[0][j] = -2.0 * Psi[1][j] * DXi2;
    //外側境界
	Omg[NX][j] = Omg[NX-1][j];//Neumann
  }

  //Poissonの方程式を解く
  var jm, jp;
  var cnt = 0;
	
  while (cnt < iteration)
  {
	maxError = 0.0;

	for (i = 1; i < NX; i++)
	{
	  ex2 = Math.exp(2 * i * DX);
	  for(j = 0; j < NY; j++)
	  {
		jm = j - 1;
		if(jm == -1) jm = NY-1; //else jm = j - 1;
		jp = j + 1;
		if(jp == NY) jp = 0; //else jp = j + 1;

		pp = ( (Psi[i - 1][j] + Psi[i + 1][j] ) * DY2
		     + (Psi[i][jm] + Psi[i][jp]) * DX2
		     + Omg[i][j] * ex2 * DX2 * DY2 ) * fct ;
		error = Math.abs(pp - Psi[i][j]);
		if (error > maxError) maxError = error;
		Psi[i][j] = pp;//更新
      }
	}
	if (maxError < tolerance) break;
	cnt++;
  }
  calcVelocity();

  //渦度輸送方程式を解く
  methodCIP();

  //流れ関数，渦度の最小値，最大値
  for(i = 1; i < NX; i++)
	for (j = 1; j < NY; j++)
	{
	  if(Psi[i][j] > maxPsi0) maxPsi0 = Psi[i][j];
	  if(Psi[i][j] < minPsi0) minPsi0 = Psi[i][j];
	  if(Omg[i][j] > maxOmg0) maxOmg0 = Omg[i][j];
	  if(Omg[i][j] < minOmg0) minOmg0 = Omg[i][j];
	}
//console.log("maxPsi= " + maxPsi0 + " minPsi = " + minPsi0);
//console.log("maxOmg= " + maxOmg0 + " minOmg = " + minOmg0);

}

function calcVelocity()
{
  //速度ベクトルの計算
  //格子点の速度ベクトル(上下左右の流れ関数の差で求める)
  var ex;
  for(i = 1; i < NX; i++)
  {
	ex = Math.exp(- i * DX);
	for (j = 0; j < NY; j++)
	{	        
	  if(j == 0) jm = NY -1; else jm = j - 1;
	  if(j == NY-1) jp = 0; else jp = j + 1;
	  //ポテンシャルの低い方から高い方へ
	  VelX[i][j] = ex * (Psi[i][jp] - Psi[i][jm]) / (DY * 2.0);//動径方向
	  VelY[i][j] = ex * (Psi[i-1][j] - Psi[i+1][j]) / (DX * 2.0);//方位角方向
	}
  }
}

function methodCIP()
{
  var newOmg = [];//新渦度
  var newGx = [];//x方向微分
  var newGy = [];//y方向微分
  var c11, c12, c21, c02, c30, c20, c03, a, b, sx, sy, x, y, dx, dx2, dx3, dy, dy2, dy3; 
	
  var i, j, ip, jp;
  for(i = 0; i <= NX; i++)
  {
    newOmg[i] = [];
    newGx[i] = [];
    newGy[i] = [];
  }


  for(i = 1; i < NX; i++)
  {
    ex = Math.exp(-i * DX);
	ex2 = ex * ex;
    for(j = 1; j < NY; j++)
	{
      if(VelX[i][j] >= 0.0) sx = 1.0; else sx = -1.0;
      if(VelY[i][j] >= 0.0) sy = 1.0; else sy = -1.0;

      x = - VelX[i][j] * deltaT;
	  y = - VelY[i][j] * deltaT;
	  ip = i - sx;//上流点
      jp = j - sy;
	  dx = sx * DX;
	  dy = sy * DY;
	  dx2 = dx * dx;
	  dx3 = dx2 * dx;
	  dy2 = dy * dy;
	  dy3 = dy2 * dy;

      c30 = ((gx[ip][j] + gx[i][j]) * dx - 2.0 * (Omg[i][j] - Omg[ip][j])) / dx3;
	  c20 = (3.0 * (Omg[ip][j] - Omg[i][j]) + (gx[ip][j] + 2.0 * gx[i][j]) * dx) / dx2;
	  c03 = ((gy[i][jp] + gy[i][j]) * dy - 2.0 * (Omg[i][j] - Omg[i][jp])) / dy3;
	  c02 = (3.0 * (Omg[i][jp] - Omg[i][j]) + (gy[i][jp] + 2.0 * gy[i][j]) * dy) / dy2;
      a = Omg[i][j] - Omg[i][jp] - Omg[ip][j] + Omg[ip][jp];
	  b = gy[ip][j] - gy[i][j];
	  c12 = (-a - b * dy) / (dx * dy2);
	  c21 = (-a - (gx[i][jp] - gx[i][j]) * dx) / (dx2*dy);
	  c11 = - b / dx + c21 * dx;

	  newOmg[i][j] = Omg[i][j] + (((c30 * x + c21 * y + c20) * x + c11 * y + gx[i][j]) * x
			        + ((c03 * y + c12 * x + c02) * y + gy[i][j]) * y) * ex;

	  newGx[i][j] = gx[i][j] + ((3.0 * c30 * x + 2.0 * (c21 * y + c20)) * x + (c12 * y + c11) * y) * ex;
      newGy[i][j] = gy[i][j] + ((3.0 * c03 * y + 2.0 * (c12 * x + c02)) * y + (c21 * x + c11) * x) * ex;

	  //粘性項に中央差分
	  newOmg[i][j] += deltaT * ( (Omg[i-1][j] - 2.0 * Omg[i][j] + Omg[i+1][j]) / dx2
							 + (Omg[i][j-1] - 2.0 * Omg[i][j] + Omg[i][j+1]) / dy2 ) * ex2 / Re;

	}
  }
  //更新
  for(j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{
	  Omg[i][j] = newOmg[i][j];
	  gx[i][j] = newGx[i][j];
	  gy[i][j] = newGy[i][j];
	}			
}

function drawContour(PP, maxP, minP, col)
{
  nLine = parseFloat(form2.nLine.value);
  
  var dp0 = (maxP - minP) / nLine;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, m;
  var data = [];
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0;
    for(j = 0; j < NY; j++)
	{
      for(i = 0; i < NX; i++)
	  {
        if(j == NY -1) jp = 0; else jp = j + 1;
        //三角形セルに分割
	    p[0] = PP[i][j];     x[0] = PosX[i][j]; y[0] = PosY[i][j];
		p[1] = PP[i+1][j];   x[1] =  PosX[i+1][j]; y[1] =  PosY[i+1][j];
		p[2] = PP[i+1][jp]; x[2] =  PosX[i+1][jp]; y[2] =  PosY[i+1][jp];
		p[3] = PP[i][jp];   x[3] = PosX[i][jp]; y[3] =  PosY[i][jp];
		p[4] = p[0]; x[4] = x[0]; y[4] = y[0];//0番目に同じ
		//中心
		p[5] = (p[0] + p[1] + p[2] + p[3]) / 4.0;
		x[5] = (x[0] + x[1] + x[2] + x[3]) / 4.0;
		y[5] = (y[0] + y[1] + y[2] + y[3]) / 4.0;

        for(m = 0; m < 4; m++)//各三角形について
        {
          x1 = -1000.0; y1 = -1000.0; 
					
		  if((p[m] <= pp && pp < p[m+1]) || (p[m] > pp && pp >= p[m+1]))
		  {
            x1 = x[m] + (x[m+1] - x[m]) * (pp - p[m]) / (p[m+1] - p[m]);
			y1 = y[m] + (y[m+1] - y[m]) * (pp - p[m]) / (p[m+1] - p[m]);
          }
		  if((p[m] <= pp && pp <= p[5]) || (p[m] >= pp && pp >= p[5]))
		  {
		    if(x1 == -1000)//まだ交点なし
			{
			  x1 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y1 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			}
			else//x1は見つかった
            {
			  x2 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y2 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			  data.push(region.pos0.x + scale.x * x1);
			  data.push(region.pos0.y + scale.y * y1);
			  data.push(region.pos0.x + scale.x * x2);
			  data.push(region.pos0.y + scale.y * y2);
			}			
          }
		  if((p[m+1] <= pp && pp <= p[5]) || (p[m+1] >= pp && pp >= p[5]))
		  {
		    if(x1 == -1000)//まだ交点なし
			{
			  x1 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y1 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			}
			else//x1は見つかった
			{
			  x2 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y2 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);			  
			  data.push(region.pos0.x + scale.x * x1);
			  data.push(region.pos0.y + scale.y * y1);
			  data.push(region.pos0.x + scale.x * x2);
			  data.push(region.pos0.y + scale.y * y2);
	        }
          }
        }//m
	  }//j
	}//i  
  }//k
  drawLines(data, col);
}

function drawVelocity()
{
  arrowScale = parseFloat(form2.arrowScale.value);;
  arrowWidth = parseFloat(form2.arrowWidth.value);
  intervalV = parseFloat(form2.intervalV.value);
  var i, j;

  //描画
  var alpha, theta, mag, x0, y0, x, y, r;
  for(i = 1; i < NX; i++)
  {
    if(i % intervalV != 0) continue;
    r = Math.exp(i * DX);
    for (j = 1; j < NY; j++)
	{
	  alpha = j * DY - Math.PI;//動径の角度(分岐線は180°）
	  x = r * Math.cos(alpha); y = r * Math.sin(alpha);//格子点位置
	  theta = Math.atan2(VelY[i][j], VelX[i][j]);
	  theta += alpha;//水平軸からの偏角
	  //theta *=  RAD_TO_DEG;//degree
	  
	  mag = Math.sqrt(VelX[i][j] * VelX[i][j] + VelY[i][j] * VelY[i][j]);
	  //if(mag > 10.0) continue;
	  //theta = Math.atan2(VelY[i][j], VelX[i][j]);
	  x0 = region.pos0.x + scale.x * x;
      y0 = region.pos0.y + scale.y * y;
	  drawArrow(x0, y0, mag * arrowScale, arrowWidth, "black", theta);
	}
  }
}

function drawGrid()
{
  var i, j;
  //全円
  for(i = 0; i <= NX; i++)
  {
    for(j = 0; j <= NY; j++)
    {
      x1 = PosX[i][j]; y1 = PosY[i][j];
      x2 = PosX[i][j+1]; y2 = PosY[i][j+1];
      drawLine(region.pos0.x + scale.x * x1, region.pos0.y + scale.y * y1,
        region.pos0.x + scale.x * x2, region.pos0.y + scale.y * y2, 1, "black");
    }
  }
  //動径
  for(j = 0; j < NY; j++)//方位角θ方向
  {
    x1 = PosX[0][j]; y1 = PosY[0][j];
    x2 = PosX[NX][j];y2 = PosY[NX][j];
    drawLine(region.pos0.x + scale.x * x1, region.pos0.y + scale.y * y1,
      region.pos0.x + scale.x * x2, region.pos0.y + scale.y * y2, 1, "black");
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
  initData();
}

function onDisplay()
{
  display();
}
function onClickScale()
{
  region.scale = parseFloat(form2.scale.value);
  display();
}

function onClickStart()
{
  fps = 0;
  elapseTime = 0;
  elapseTime0 = 0;
  elapseTime1 = 0;
  elapseTimeN = 0;
  elapseTimeN0 = 0;
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
  elapseTimeN0 = 0;
  flagStart = false;
  flagStep = false;
  initData();
  form1.e_time.value = "0";
  form1.n_time.value = "0";
  display();
}



