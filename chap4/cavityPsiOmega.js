/*----------------------------------------------
     cavityPsiOmega.js
     流れ関数-渦度法
     粒子アニメーション
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
var flagFreeze = false;
var flagStep = false;
var flagReset = false;

//数値計算
var Psi = [];  //流れ関数
var Omega = [];//渦度
var gx = [];   //ｘ方向微分
var gy = [];   //ｙ方向微分
var VelX = []; //ｘ方向速度
var VelY = []; //ｙ方向速度
var type = []; //格子点のタイプ
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagStream = true;
var flagVorticity = true;
var flagVelocity = false;
var flagGrid = false;
var nLine = 20;//流線,ポテンシャルの表示本数
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

var deltaT = 0.01;
var Re = 500.0;//レイノルズ数

var maxPsi = 0.1;
var minPsi = -0.1;
var maxOmg = 40.0;
var minOmg = -50.0;

//粒子アニメーション
var sizeParticle = 5;
var speedCoef = 1.0;//速度倍率
var intervalP = 0.05;

//解析領域矩形構造体
function Rect()
{
  this.scale = 1.7;//表示倍率
  this.nMeshX = 40;//x方向割数（固定）
  this.nMeshY = 40; //y方向分割数（固定）
  this.size = new Vector3(1, 1, 0);//矩形ダクト領域のサイズ（固定）
  this.left0 = new Vector3(-1, -1, 0);//その左下位置
  this.delta = new Vector3(); //格子間隔
}
var rect = new Rect();
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
  form1.nMeshX.value = rect.nMeshX;
  form1.nMeshY.value = rect.nMeshY;
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.psi.checked = flagStream;
  form2.omega.checked = flagVorticity;
  form2.velocity.checked = flagVelocity;
  form2.maxPsi.value = maxPsi;
  form2.minPsi.value = minPsi;
  form2.maxOmg.value = maxOmg;
  form2.minOmg.value = minOmg;
  
  initData();

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
      elapseTime += frameTime;
      elapseTimeN += deltaT;//数値計算上の経過時間（無次元時間）
        
      calculate(); 
      gl.clear(gl.COLOR_BUFFER_BIT);
      if(form2.particle.checked) drawParticle(timestep);  
      display();
      
      elapseTime0 = elapseTime;//現在の経過時間を保存
      elapseTimeN0 = elapseTimeN;//現在の経過時間を保存
      
      form1.e_time.value = elapseTime.toString();
      form1.n_time.value = elapseTimeN.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
  }
  animate();

}

function initData()
{
  deltaT = parseFloat(form1.deltaT.value);
  Re = parseFloat(form1.Re.value);
  NX = parseInt(form1.nMeshX.value);
  NY = parseInt(form1.nMeshY.value);

  DX = rect.size.x / NX;//格子間隔
  DY = rect.size.y / NY;

  initParticle();//粒子アニメーションの初期化
  
  var i, j;
  
  for(i = 0; i <= NX; i++)
  {//配列の2次元化
    type[i] = [];//格子点のタイプ
    Psi[i] = [];  //流れ関数
    Omega[i] = [];//渦度
    gx[i] = [];   //ｘ方向微分
    gy[i] = [];   //ｙ方向微分
    VelX[i] = []; //ｘ方向速度
    VelY[i] = []; //ｙ方向速度
  }  

  //格子点のタイプ
  for(j = 0; j <= NY; j++)
  {
	for(i = 0; i <= NX; i++)
    {
	  type[i][j] = "INSIDE";//内点
	  if(j == 0)  type[i][j] = "BOTTOM";//下側壁面
	  if(j == NY) type[i][j] = "TOP";   //上側壁面
	  if(i == 0)  type[i][j] = "LEFT";  //左側側面
	  if(i == NX) type[i][j] = "RIGHT"; //右側側面
	  if(i == 0 && j == 0)   type[i][j] = "CORNER_UR";//左下隅
	  if(i == NX && j == 0)  type[i][j] = "CORNER_UL";//右下隅
	  if(i == 0 && j == NY)  type[i][j] = "CORNER_LR";//左上隅
	  if(i == NX && j == NY) type[i][j] = "CORNER_LL";//右上隅
	}
  }

  //初期値
  //Topは流速1
  //すべての壁は psi = 0
  for(j = 0; j <= NY; j++)
	for (i = 0; i <= NX; i++)
	{
	  //流れ関数
	  Psi[i][j] = 0;
	  //渦度
	  Omega[i][j] = 0.0;
      //速度
	  if(type[i][j] == "TOP" ) VelX[i][j] = 1.0;
	  else VelX[i][j] = 0.0;
      VelY[i][j] = 0.0;
      //CIP法で使用する微分値
      gx[i][j] = 0.0;
      gy[i][j] = 0.0;
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

  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}

function display()
{
  if(!flagStart) gl.clear(gl.COLOR_BUFFER_BIT);
  flagStream = form2.psi.checked;
  flagVorticity = form2.omega.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  //計算領域描画
  drawRegion();

　//流線、等渦度線表示
  maxPsi = parseFloat(form2.maxPsi.value);
  minPsi = parseFloat(form2.minPsi.value);
  maxOmg = parseFloat(form2.maxOmg.value);
  minOmg = parseFloat(form2.minOmg.value);
  if( flagStream ) drawContour(Psi, minPsi, maxPsi, "red");
  if( flagVorticity ) drawContour(Omega, minOmg, maxOmg, "blue");
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
  //ダクト
  var sx = scale.x * rect.size.x / 2;//ダクトの幅は2*sx
  var sy = scale.y * rect.size.y / 2;//ダクトの高さは2*sy
  drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
}

function drawRegion()
{
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
  var sx = scale.x * rect.size.x / 2;//ダクトの幅は2*sx
  var sy = scale.y * rect.size.y / 2;//ダクトの高さは2*sy
  //ダクト
  drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
  
  //ダクトの左下基準点
  rect.left0.x = - sx;
  rect.left0.y = - sy;
}

function calculate()
{
  var i, j;
  var iteration = 10;//最大繰り返し回数(Poisson方程式）
  var tolerance = 0.00001;//許容誤差
  var error = 0.0;
  var maxError = 0.0;
  var pp;
  var DX2 = DX * DX;
  var DY2 = DY * DY;
  var DD2 = DX2 + DY2;//corner

  //渦度境界条件
  for (i = 0; i <= NX; i++)
	for (j = 0; j <= NY; j++) 
	{
	  if(type[i][j] == "INSIDE") continue;
	  else if(type[i][j] == "TOP") Omega[i][j] = -2.0 * (Psi[i][j-1] + DY) / DY2;
	  else if(type[i][j] == "BOTTOM") Omega[i][j] = -2.0 * Psi[i][j+1] / DY2;
	  else if(type[i][j] == "LEFT") Omega[i][j] = -2.0 * Psi[i+1][j] / DX2;
	  else if(type[i][j] == "RIGHT") Omega[i][j] = -2.0 * Psi[i-1][j] / DX2;
	  else if(type[i][j] == "CORNER_UR") Omega[i][j] = -2.0 * Psi[1][1] / DD2;//左下隅
	  else if(type[i][j] == "CORNER_UL") Omega[i][j] = -2.0 * Psi[i-1][1] / DD2;//右下隅
	  else if(type[i][j] == "CORNER_LR") Omega[i][j] = -2.0 * Psi[1][j-1] / DD2;//左上隅
	  else if(type[i][j] == "CORNER_LL") Omega[i][j] = -2.0 * Psi[i-1][j-1] / DD2;//右上隅
    }

  //Poissonの方程式を解く
  var cnt = 0;
  while (cnt < iteration)
  {
    maxError = 0.0;
	for (i = 1; i < NX; i++)
	  for (j = 1; j < NY; j++)
	  {
	    //if(type[i][j] != "INSIDE") continue;
		pp = ( DY2 * (Psi[i-1][j] + Psi[i+1][j]) + DX2 * (Psi[i][j-1] + Psi[i][j+1])
	       + Omega[i][j] * DX2 * DY2 ) / (2.0 * (DX2 + DY2));
	    error = Math.abs(pp - Psi[i][j]);
		if (error > maxError) maxError = error;
	    Psi[i][j] = pp;//更新
	  }
	  
    if (maxError < tolerance) break;
	cnt++;
  }
//console.log("cnt = " + cnt + " maxEr = " + maxError );
  calcVelocity();//速度の更新(ψ→ω変換)

  //渦度輸送方程式を解く

  methodCIP();

  //流れ関数，渦度の最小値，最大値
  for(i = 1; i < NX; i++)
	for (j = 1; j < NY; j++)
	{
      if(type[i][j] >= "OBS_LEFT")  continue;
	  if(Psi[i][j] > maxPsi0) maxPsi0 = Psi[i][j];
	  if(Psi[i][j] < minPsi0) minPsi0 = Psi[i][j];
	  if(Omega[i][j] > maxOmg0) maxOmg0 = Omega[i][j];
	  if(Omega[i][j] < minOmg0) minOmg0 = Omega[i][j];
	}
console.log("maxPsi= " + maxPsi0 + " minPsi = " + minPsi0);
console.log("maxOmg= " + maxOmg0 + " minOmg = " + minOmg0);

}

function calcVelocity()
{
  //速度ベクトルの計算
  //格子点の速度ベクトル(上下左右の流れ関数の差で求める)
  var i, j;
 
  for (j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{
      if(type[i][j] != "INSIDE") continue;
	  //ポテンシャルの低い方から高い方へ
	  VelX[i][j] = (Psi[i][j+1] - Psi[i][j-1]) / (DY * 2.0);
	  VelY[i][j] = (Psi[i-1][j] - Psi[i+1][j]) / (DX * 2.0);
	}
}

function methodCIP()
{
  var newOmega = [];//新渦度
  var newGx = [];//x方向微分
  var newGy = [];//y方向微分
  var c11, c12, c21, c02, c30, c20, c03, a, b, sx, sy, x, y, dx, dx2, dx3, dy, dy2, dy3; 
	
  var i, j, ip, jp;
  for(i = 0; i <= NX; i++)
  {
    newOmega[i] = [];
    newGx[i] = [];
    newGy[i] = [];
  }


  for(j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{
      if(type[i][j] != "INSIDE") continue;

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

      c30 = ((gx[ip][j] + gx[i][j]) * dx - 2.0 * (Omega[i][j] - Omega[ip][j])) / dx3;
	  c20 = (3.0 * (Omega[ip][j] - Omega[i][j]) + (gx[ip][j] + 2.0 * gx[i][j]) * dx) / dx2;
	  c03 = ((gy[i][jp] + gy[i][j]) * dy - 2.0 * (Omega[i][j] - Omega[i][jp])) / dy3;
	  c02 = (3.0 * (Omega[i][jp] - Omega[i][j]) + (gy[i][jp] + 2.0 * gy[i][j]) * dy) / dy2;
      a = Omega[i][j] - Omega[i][jp] - Omega[ip][j] + Omega[ip][jp];
	  b = gy[ip][j] - gy[i][j];
	  c12 = (-a - b * dy) / (dx * dy2);
	  c21 = (-a - (gx[i][jp] - gx[i][j]) * dx) / (dx2*dy);
	  c11 = - b / dx + c21 * dx;

	  newOmega[i][j] = Omega[i][j] + ((c30 * x + c21 * y + c20) * x + c11 * y + gx[i][j]) * x
			        + ((c03 * y + c12 * x + c02) * y + gy[i][j]) * y;

	  newGx[i][j] = gx[i][j] + (3.0 * c30 * x + 2.0 * (c21 * y + c20)) * x + (c12 * y + c11) * y;
			newGy[i][j] = gy[i][j] + (3.0 * c03 * y + 2.0 * (c12 * x + c02)) * y + (c21 * x + c11) * x;

	  //粘性項に中央差分
	  newOmega[i][j] += deltaT * ( (Omega[i-1][j] - 2.0 * Omega[i][j] + Omega[i+1][j]) / dx2
							 + (Omega[i][j-1] - 2.0 * Omega[i][j] + Omega[i][j+1]) / dy2 ) / Re;

	}
  //更新
  for(j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{
      if(type[i][j] != "INSIDE") continue;
	  Omega[i][j] = newOmega[i][j];
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
	  {//三角形セルに分割
        //1つでも内点なら描画
	    if( type[i][j] != "INSIDE" && type[i][j+1] != "INSIDE" 
	     && type[i+1][j+1] != "INSIDE" && type[i+1][j] != "INSIDE" ) continue;

	    p[0] = PP[i][j]; x[0] = i * DX;     y[0] = j * DY;
	    p[1] = PP[i][j+1]; x[1] = i * DX;     y[1] = (j+1) * DY;
	    p[2] = PP[i+1][j+1]; x[2] = (i+1) * DX; y[2] = (j+1) * DY;
	    p[3] = PP[i+1][j]; x[3] = (i+1) * DX; y[3] = j * DY;
	    p[4] = p[0]; x[4] = x[0]; y[4] = y[0];//0番目に同じ
		//中心
		p[5] = (p[0] + p[1] + p[2] + p[3]) / 4.0;
		x[5] = (x[0] + x[1] + x[2] + x[3]) / 4.0;
		y[5] = (y[0] + y[1] + y[2] + y[3]) / 4.0;

        for(m = 0; m < 4; m++)//各三角形について
        {
          x1 = -10.0; y1 = -10.0; 
					
		  if((p[m] <= pp && pp < p[m+1]) || (p[m] > pp && pp >= p[m+1]))
		  {
            x1 = x[m] + (x[m+1] - x[m]) * (pp - p[m]) / (p[m+1] - p[m]);
			y1 = y[m] + (y[m+1] - y[m]) * (pp - p[m]) / (p[m+1] - p[m]);
          }
		  if((p[m] <= pp && pp <= p[5]) || (p[m] >= pp && pp >= p[5]))
		  {
		    if(x1 < 0.0)//まだ交点なし
			{
			  x1 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y1 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			}
			else//x1は見つかった
            {
			  x2 = x[m] + (x[5] - x[m]) * (pp - p[m]) / (p[5] - p[m]);
			  y2 = y[m] + (y[5] - y[m]) * (pp - p[m]) / (p[5] - p[m]);
			  data.push(rect.left0.x + scale.x * x1);
			  data.push(rect.left0.y + scale.y * y1);
			  data.push(rect.left0.x + scale.x * x2);
			  data.push(rect.left0.y + scale.y * y2);
			}			
          }
		  if((p[m+1] <= pp && pp <= p[5]) || (p[m+1] >= pp && pp >= p[5]))
		  {
		    if(x1 < 0.0)//まだ交点なし
			{
			  x1 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y1 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			}
			else//x1は見つかった
			{
			  x2 = x[m+1] + (x[5] - x[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);
			  y2 = y[m+1] + (y[5] - y[m+1]) * (pp - p[m+1]) / (p[5] - p[m+1]);			  
			  data.push(rect.left0.x + scale.x * x1);
			  data.push(rect.left0.y + scale.y * y1);
			  data.push(rect.left0.x + scale.x * x2);
			  data.push(rect.left0.y + scale.y * y2);
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
  var theta, mag, x0, y0;
  for(i = 1; i < NX; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j < NY; j++)
	{
	  if(j % intervalV != 0) continue;
	  if(type[i][j] == "OBS_TOP") continue;

	  mag = Math.sqrt(VelX[i][j] * VelX[i][j] + VelY[i][j] * VelY[i][j]);
	  if(mag > 10.0) continue;
	  theta = Math.atan2(VelY[i][j], VelX[i][j]);
	  x0 = rect.left0.x + scale.x * i * DX;
      y0 = rect.left0.y + scale.y * j * DY;
	  drawArrow(x0, y0, mag * arrowScale, arrowWidth, "black", theta);
	}
  }
}

function drawGrid()
{
  var i, j;
  for(i = 1; i < NX; i++)
  {
    drawLine(rect.left0.x + scale.x * i * DX, rect.left0.y,
      rect.left0.x + scale.x * i * DX, rect.left0.y + scale.y * rect.size.y, 1, "black");
  }
  for(j = 1; j < NY; j++)
  {
    drawLine(rect.left0.x, rect.left0.y + scale.y * j * DY,
    rect.left0.x + scale.x * rect.size.x, rect.left0.y + scale.y * j * DY, 1, "black");
  }
}

//-----------------------------------------------------------------
function Particle2D()
{
  this.pos = new Vector3();
  this.vel = new Vector3();
  this.col;
}
var countP = 0;
var pa = [];//particle
var sizeP = 6;
var speedCoef = 0.1;
var numMaxP;//最大個数
var typeP = 1;

function initParticle()
{
  numMaxP = NX * NY;//粒子総数

  var i, j, k;
  //粒子インスタンス
  for(k = 0; k < numMaxP; k++) pa[k] = new Particle2D();
  k = 0;
  //粒子初期配置
  for(j = 1; j < NY; j++)
	for(i = 1; i < NX; i++)
	{
	  pa[k].pos = new Vector3(i * DX, j * DY, 0);
	  if(i  < NX / 3)         pa[k].col = "red";
	  else if(i < NX * 2 / 3) pa[k].col = "green";
	  else                    pa[k].col = "blue";
	  k ++;
	}

}

function drawParticle(dt)
{
  flagPoint = true;  
  var k, KR, KG, KB = 0;
  var dataR = []; 
  var dataG = [];
  var dataB = [];
  var vel = new Vector3(); 

  KR = KG = KB = 0;
  for(k = 0; k < numMaxP; k++)
  {
    vel = getVelocityParticle(pa[k].pos);

	if(!flagFreeze) {
      pa[k].pos.x += vel.x * dt * speedCoef;
      pa[k].pos.y += vel.y * dt * speedCoef;
      if(pa[k].pos.x < DX) pa[k].pos.x = DX;
      if(pa[k].pos.x > 1-DX) pa[k].pos.x = 1 - DX;
      if(pa[k].pos.y < DY) pa[k].pos.y = DY;
      if(pa[k].pos.y > 1-DY) pa[k].pos.y = 1 - DY;
    }
    if(pa[k].col == "red")
    { 
      dataR[2*KR] = rect.left0.x + pa[k].pos.x * scale.x; 
      dataR[2*KR+1] = rect.left0.y + pa[k].pos.y * scale.y; 
      KR++;
    }
    else if(pa[k].col == "green")
    { 
      dataG[2*KG] = rect.left0.x + pa[k].pos.x * scale.x; 
      dataG[2*KG+1] = rect.left0.y + pa[k].pos.y * scale.y; 
      KG++;
    }
    else if(pa[k].col == "blue")
    { 
      dataB[2*KB] = rect.left0.x + pa[k].pos.x * scale.x; 
      dataB[2*KB+1] = rect.left0.y + pa[k].pos.y * scale.y; 
      KB++;
    }
  }

  drawPoints(dataR, sizeP, typeP, "red");
  drawPoints(dataG, sizeP, typeP, "green");
  drawPoints(dataB, sizeP, typeP, "blue");
}

function getVelocityParticle(pos)
{
  var vel = new Vector3();

  var i, j, I, J;

  //格子番号を取得
  I = 0; J = 0;
  for(i = 0; i < NX; i++)
  {
	if(i * DX < pos.x && (i+1) * DX > pos.x) I = i;
  }
  for(j = 0; j < NY; j++)
  {
 	if(j * DY < pos.y && (j+1) * DY > pos.y) J = j;
  }
  var a =  pos.x / DX - I;
  var b =  pos.y / DY - J;
  //格子点の速度を線形補間
  vel.x = (1.0 - b) * ((1.0 - a) * VelX[I][J] + a * VelX[I+1][J]) + b * ((1.0 - a) * VelX[I][J+1] + a * VelX[I+1][J+1]);
  vel.y = (1.0 - b) * ((1.0 - a) * VelY[I][J] + a * VelY[I+1][J]) + b * ((1.0 - a) * VelY[I][J+1] + a * VelY[I+1][J+1]);
  return vel;
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
  rect.scale = parseFloat(form2.scale.value);
  display();
}
//-------------------------------------------------------------
function onClickP()
{ 
  speedCoef = parseFloat(form2.speedCoef.value);
  sizeP= parseFloat(form2.sizeP.value);
  typeP= parseFloat(form2.typeP.value);
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
  flagFreeze = false;
  lastTime = new Date().getTime();
}
function onClickFreeze()
{
  flagStart = !flagStart;
  flagFreeze = !flagFreeze;
  
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



