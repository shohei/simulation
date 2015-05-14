/*----------------------------------------------
     potentialFlow2.js
     ポテンシャル流れ
     一様流れ+対になった湧き出しと吸い込み+渦
     粒子アニメーション
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//animation
var lastTime;
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagFreeze = false;
var flagStep = false;
var flagReset = false;
//ポテンシャル流れ
var Phi = [];//ポテンシャル
var Psi = [];//流れ関数
var VelX = [];//格子点の速度
var VelY = [];
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagUniform = true;
var flagSource  = false;
var flagVortex = false;
var flagPotential = true;
var flagStream = false;
var flagVelocity = false;
var flagGrid = false;
var flagStart = false;
var alpha = 0;///一様流れの傾斜角
var flowVelocity = 1;//一様流れの流速
var Q_Value = 1;//湧き出し量
var distA = 0.1;//原点から湧出し，吸込みまでの距離
var Gamma = 1;  //循環
var nLine = 40;//流線,ポテンシャルの表示本数
var range = 1;//その範囲
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

//解析領域矩形構造体
function Rect()
{
  this.scale = 1;//表示倍率
  this.size = 2;//矩形領域のサイズ
  this.nMesh = 50;//全体の分割数(X,Y共通）
  this.delta ;//格子間隔
  this.left0 = new Vector3(-1, -1, 0);//その左下位置
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
  
  form2.nMesh.value = rect.nMesh;
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.range.value = range;

  calculate();
  
  initParticle();

  var fps = 0;
  var timestep = 0;
  var lastTime = new Date().getTime();
  var animate = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animate, canvas); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
    elapseTime += frameTime;//全経過時間
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
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawParticle(timestep);  
      display();   
      elapseTime0 = elapseTime;//現在の経過時間を保存
      form1.time.value = elapseTime.toString();
      
      if(flagStep) { flagStart = false; } 
    }      
  }
  animate();

}

function calculate()
{  
  //ポテンシャル流れの計算パラメータ
  flagUniform = form2.Uniform.checked ;
  flagSource = form2.Source.checked ;
  flagVortex = form2.Vortex.checked ;

  rect.nMesh = parseInt(form2.nMesh.value);
  rect.delta = rect.size / rect.nMesh;
  alpha = parseFloat(form2.alpha.value);
  Q_Value = parseFloat(form2.Q_Value.value);
  distA = parseFloat(form2.distA.value);
  Gamma = parseFloat(form2.Gamma.value);

  var i, j;
  for(i = 0; i <= rect.nMesh; i++)
  {//配列の2次元化
    Phi[i] = [];//ポテンシャル
    Psi[i] = [];//流れ関数
    VelX[i] = [];//速度
    VelY[i] = [];
  }
  //ポテンシャル，流れ関数,速度のクリア
  for (j = 0; j <= rect.nMesh; j++)
  {  
    for (i = 0; i <= rect.nMesh; i++)
      Phi[i][j] = Psi[i][j] = VelX[i][j] = VelY[i][j] = 0.0;
  }
	
  var z = new Vector3();
  var r1 = 0.0, r2 = 0.0;//２乗距離
  var x1 = 0.0, x2 = 0.0;//湧き出し点と吸い込み点
  var rad0 = 0.001;
  var ang = alpha * DEG_TO_RAD;
  
  for (i = 0; i <= rect.nMesh; i++)
  {
    z.x = rect.delta * (i - rect.nMesh / 2);//中心のポテンシャルを0
    x1 = z.x + distA;
    x2 = z.x - distA;
    for (j = 0; j <= rect.nMesh; j++)
    {
      //k = i + j * (rect.nMesh + 1);
      z.y = rect.delta * (j - rect.nMesh / 2);

      if(flagUniform) 
      {
	    Phi[i][j] = flowVelocity * (z.x * Math.cos(ang) + z.y * Math.sin(ang));
		Psi[i][j] = flowVelocity * (z.y * Math.cos(ang) - z.x * Math.sin(ang));
		VelX[i][j] = flowVelocity * Math.cos(ang);
		VelY[i][j] = flowVelocity * Math.sin(ang);
      }
      
      if (flagSource)//湧き出し＋吸い込み
	  {
        if (x1 == -distA && z.y == 0.0)
        {//対数的特異点
		  x1  = -distA + rect.delta / 1000.0;
          z.y = rect.delta / 1000.0;
        }
        if (x2 == distA && z.y == 0.0)
        {//対数的特異点
		  x2  = distA + rect.delta / 1000.0;
          z.y = rect.delta / 1000.0;
        }
        r1 = x1 * x1 + z.y * z.y;//2乗距離
        r2 = x2 * x2 + z.y * z.y;//2乗距離
		if(r1 < rad0) r1 = rad0;//中心付近の速度を抑えるため
		if(r2 < rad0) r2 = rad0;//中心付近の速度を抑えるため
        Phi[i][j] += Q_Value * Math.log(r1 / r2) / (4.0 * Math.PI);
        Psi[i][j] += Q_Value * (Math.atan2(z.y, x1) - Math.atan2(z.y, x2)) / (2.0 * Math.PI);
		VelX[i][j] += Q_Value * (x1 / r1 - x2 / r2) / (2.0 * Math.PI);
		VelY[i][j] += Q_Value * (z.y / r1 - z.y / r2 )/ (2.0 * Math.PI);
      }

	  if (flagVortex)//うず
	  {
        if(z.x == 0 && z.y == 0)
        {//原点は対数的特異点
          z.x = rect.delta / 100.0;
          z.y = rect.delta / 100.0;;
        }
		r2 = mag2(z);
		if(r2 < rad0) r2 = rad0;//中心付近の速度を抑えるため
        Psi[i][j] -= Gamma * (Math.log(r2) / (4.0 * Math.PI));
        Phi[i][j] += Gamma * Math.atan2(z.y, z.x) / (2.0 * Math.PI);
		VelX[i][j] -= Gamma * z.y / r2 / (2.0 * Math.PI);
		VelY[i][j] += Gamma * z.x / r2 / (2.0 * Math.PI);
      } 
    }
  }
  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}

function display()
{
  flagPotential = form2.phi.checked;
  flagStream = form2.psi.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
  flagPoint = false;

  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  //計算領域描画
  drawRegion();

  if( flagPotential ) drawContour(Phi, "red");
  if( flagStream ) drawContour(Psi, "blue");
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
      

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
  var sx = scale.x * rect.size / 2;//表示領域の幅は2*sx
  var sy = scale.y * rect.size / 2;//表示領域の高さは2*sx
  drawRectangle(0, 0, 2*sx, 2*sy, false, "black", 0);
  
  //左下基準点
  rect.left0.x = - sx;
  rect.left0.y = - sy;
  //格子間隔
  rect.delta = rect.size / rect.nMesh;
  //x-y座標
  drawLine(rect.left0.x, 0, rect.left0.x + scale.x * rect.size, 0, 1, "gray");
  drawLine(0, rect.left0.y, 0, rect.left0.y + scale.y * rect.size, 1, "gray");

}

function drawContour(PP, col)
{
  nLine = parseFloat(form2.nLine.value);
  range = parseFloat(form2.range.value);
  var nGridX = rect.nMesh + 1;
  var maxP =  flowVelocity * range;
  var minP = -flowVelocity * range;
  var dp0 = (maxP - minP) / nLine;//+0.00001;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, k, m;
  var k0, k1, k2, k3;
  var data = [];
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0;
    //data = []; 
    for(i = 0; i < rect.nMesh; i++)
	{
	  for(j = 0; j < rect.nMesh; j++)
	  {//三角形セルに分割
        /*k0 = i + j * nGridX; k1 = i + (j+1) * nGridX;
	    k2 = i+1 + (j+1) * nGridX; k3 = i+1 + j * nGridX;
	    p[0] = PP[k0]; x[0] = i * rect.delta;     y[0] = j * rect.delta;
	    p[1] = PP[k1]; x[1] = i * rect.delta;     y[1] = (j+1) * rect.delta;
	    p[2] = PP[k2]; x[2] = (i+1) * rect.delta; y[2] = (j+1) * rect.delta;
	    p[3] = PP[k3]; x[3] = (i+1) * rect.delta; y[3] = j * rect.delta;
	    p[4] = p[0]; x[4] = x[0]; y[4] = y[0];//0番目に同じ
*/
	    p[0] = PP[i][j];    x[0] = i * rect.delta;     y[0] = j * rect.delta;
	    p[1] = PP[i][j+1];  x[1] = i * rect.delta;     y[1] = (j+1) * rect.delta;
	    p[2] = PP[i+1][j+1];x[2] = (i+1) * rect.delta; y[2] = (j+1) * rect.delta;
	    p[3] = PP[i+1][j];  x[3] = (i+1) * rect.delta; y[3] = j * rect.delta;
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
  var i, j, k;

  //描画
  var theta, magni, x0, y0;
  var vx, vy;
  for(i = 1; i < rect.nMesh; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j < rect.nMesh; j++)
	{
	  if(j % intervalV != 0) continue;
	  k = i + j * (rect.nMesh+1);
      vx = VelX[i][j] * scale.x;
      vy = VelY[i][j] * scale.y;
	  magni = Math.sqrt(vx*vx + vy*vy) ;
	  if(magni > 10.0) continue;
	  theta = Math.atan2(vy, vx);
	  x0 = rect.left0.x + scale.x * i * rect.delta;
      y0 = rect.left0.y + scale.y * j * rect.delta;
	  drawArrow(x0, y0, magni * arrowScale, arrowWidth, "black", theta);
	}
  }
}

function drawGrid()
{
  var i, j;
  for(i = 1; i < rect.nMesh; i++)
  {
    drawLine(rect.left0.x + scale.x * i * rect.delta, rect.left0.y,
      rect.left0.x + scale.x * i * rect.delta, rect.left0.y + scale.y * rect.size, 1, "blue");
  }
  for(j = 1; j < rect.nMesh; j++)
  {
    drawLine(rect.left0.x, rect.left0.y + scale.y * j * rect.delta,
     rect.left0.x + scale.x * rect.size, rect.left0.y + scale.y * j * rect.delta, 1, "blue");
  }
}
//-----------------------------------------------------------------
function Particle2D()
{
  this.pos = new Vector3(1000.0, 1000.0, 0);
  this.vel = new Vector3();
}
var countP = 0;
var pa = [];//particle
var sizeP = 3;
var speedCoef = 1;
var countPeriod = 0;
var period = 0.0;//[s]
var numMaxP =10000;//最大個数
var num0 = 100;
var typeP = 1;

function initParticle()
{
  //粒子
  for(var i = 0; i < numMaxP; i++)　pa[i] = new Particle2D();
}

function drawParticle(dt)
{
  flagPoint = true;  
  var k, k0, K = 0;
  var dataP = []; 
  var vel = new Vector3();
  
  if(!flagFreeze && countPeriod == 0)
  {
    for(k0 = 0; k0 < num0; k0++)
	{
	  k = countP + k0;
	  createParticle(k);
	}
	countP += num0;
  }

  K = 0;
  for(k = 0; k < numMaxP; k++)
  {
    vel = getVelocityParticle(pa[k].pos);

	if(!flagFreeze) {
      pa[k].pos.x += vel.x * dt * speedCoef;
      pa[k].pos.y += vel.y * dt * speedCoef;
    }
	if(pa[k].pos.x >= 0.0 && pa[k].pos.x < rect.size 
			&& pa[k].pos.y >= 0.0 && pa[k].pos.y < rect.size) 
    { 
      dataP[2*K] = rect.left0.x+ pa[K].pos.x * scale.x; 
      dataP[2*K+1] = rect.left0.y + pa[K].pos.y * scale.y; 
      K++;
    }
    else{
      if( countPeriod == 0) createParticle(k); 
    }
  }
  drawPoints(dataP, sizeP, typeP, "black");
  if(countP > numMaxP-num0) countP = 0;
  
  countPeriod += dt;
  if(countPeriod > period){
    countPeriod = 0;
  }
}

function createParticle(k)
{
  if(flagUniform && flagSource && Q_Value > 0.0)
  {
	if((k % 2) == 0)
	{
	  pa[k].pos.y = rect.size * getRandom(0.0, 1.0);
      pa[k].pos.x = 0.01;//左端(left0)からの位置
	}
	else
	{
      pa[k].pos = getRandomRingVectorXY(0.01, 0.02);
      pa[k].pos.x += rect.size/2 - distA;
      pa[k].pos.y += rect.size/2;
	}
  } 
  else if(!flagUniform && flagSource && Q_Value > 0.0)
  {
    pa[k].pos = getRandomRingVectorXY(0.01, 0.02);
    pa[k].pos.x += rect.size/2 - distA;
    pa[k].pos.y += rect.size/2;
  }
  else
  {
    pa[k].pos.x = 0.01;//左端(left0)からの位置
	pa[k].pos.y = rect.size * getRandom(0, 1);
  }
}

function getVelocityParticle(pos)
{
  var vel = new Vector3();
  var nGridX = rect.nMesh + 1;
  
  var i, j, I, J;
  //格子番号を取得
  I = 0; J = 0;
  for(i = 0; i < rect.nMesh; i++)
  {
	if(i * rect.delta < pos.x && (i+1) * rect.delta > pos.x) I = i;
  }
  for(j = 0; j < rect.nMesh; j++)
  {
 	if(j * rect.delta < pos.y && (j+1) * rect.delta > pos.y) J = j;
  }
  var a =  pos.x / rect.delta - I;
  var b =  pos.y / rect.delta - J;
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
  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}

function onChangeData()
{
  calculate();
}

function onDisplay()
{
  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}
function onClickScale()
{
  rect.scale = parseFloat(form2.scale.value);
  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}

//-------------------------------------------------------------

function onClickP()
{ 
  numMaxP = parseInt(form2.numMaxP.value);
  num0 = parseInt(form2.num0.value);
  period = parseFloat(form2.period.value);
  speedCoef = parseFloat(form2.speedCoef.value);
  sizeP= parseFloat(form2.sizeP.value);
  typeP= parseFloat(form2.typeP.value);
}

function onClickStart()
{
  elapseTime = 0;
  elapseTime0 = 0;
  elapseTime1 = 0;
  flagStart = true;
  flagStep = false;
  flagFreez = false;
  lastTime = new Date().getTime();
  initParticle();　
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
  initParticle();
  form1.time.value = "0";
  gl.clear(gl.COLOR_BUFFER_BIT);
  display();
}


