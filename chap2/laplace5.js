/*----------------------------------------------
     laplace5.js
     キャビティが存在するダクトの流線と速度ポテンシャル
     ラプラス方程式を差分法で解く
     粒子アニメーション
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//animation
var elapseTime = 0.0;//全経過時間
var elapseTime0 = 0.0;
var elapseTime1 = 0.0;
var flagStart = false;
var flagFreeze = false;
var flagStep = false;
var flagReset = false;

//流線と速度ポテンシャル
var Psi = [];
var Phi = [];
var VelX = [];//速度
var VelY = [];
var type = [];//格子点のタイプ
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagStream = true;
var flagPotential = true;
var flagVelocity = false;
var flagGrid = false;
var nLine = 20;//流線,ポテンシャルの表示本数
var range = 1;//その範囲(流線の最大は1）
var maxVelocity = 2.5;//圧力のカラー表示に必要
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔
var nMeshX0, nMeshX1, nMeshX2, nCavWX, nCavWY, nMeshY0;
var iteration = 50000;//最大繰り返し回数
var tolerance = 0.00001;//許容誤差

//解析領域矩形構造体
function Rect()
{
  this.scale = 1.7;//表示倍率
  this.nMeshX = 100;//x方向割数（固定）
  this.nMeshY = 50; //y方向分割数（固定）
  this.size = new Vector3(2, 1, 0);//矩形領域のサイズ（固定）
  this.left0 = new Vector3(-1, 0, 0);//その左下位置
  this.delta = new Vector3(); //格子間隔
  this.cav_x0 = 1;  //左端からCavity中心までの距離
  this.cav_left = 0.6;//左端からCavity左端までの距離
  this.cav_right = 1.0;//左端からCavity左端までの距離
  this.cav_widthX = 0.8;//Cavityの幅(ｘ方向）
  this.cav_widthY = 0.5; //Cavityの深さ(ｙ方向)
  this.sizeY0 = 0.5;//ダクト入出力端の幅（高さ）
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
  form2.cavX0.value = rect.cav_x0;
  form2.cavWX.value = rect.cav_widthX;
  form2.cavWY.value = rect.cav_widthY;
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.range.value = range;
  form2.phi.checked = flagPotential;
  
  init();
  calculatePsi();
  calculatePhi();
  gl.clear(gl.COLOR_BUFFER_BIT);
  display();  
  
  initParticle();//粒子アニメーションの初期化
  
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

function init()
{
  rect.cav_x0 = parseFloat(form2.cavX0.value);
  rect.cav_widthX = parseFloat(form2.cavWX.value);
  rect.cav_widthY = parseFloat(form2.cavWY.value);

  var eps = 0.000001;

  rect.delta.x = rect.size.x / rect.nMeshX;//格子間隔
  rect.delta.y = rect.size.y / rect.nMeshY;
  rect.cav_left = rect.cav_x0 - rect.cav_widthX / 2;
  rect.cav_right = rect.cav_left + rect.cav_widthX;
  
  nMeshX0 = Math.floor((rect.cav_x0+eps) / rect.delta.x);//cavity中心0.2が0.19999999999となることあるため
  nMeshX1 = Math.floor((rect.cav_left+eps) / rect.delta.x);//cavity左端
  nMeshX2 = Math.floor((rect.cav_left + rect.cav_widthX + eps) / rect.delta.x);//cavity右端
  nCavWX = nMeshX2 - nMeshX1;
  nCavWY = Math.floor((rect.cav_widthY+eps) / rect.delta.y);
  nMeshY0 = rect.nMeshY - nCavWY;//入出力端のｙ方向格子数
  if(Math.abs(rect.cav_x0 - rect.delta.x * nMeshX0) > eps) alert("cavity中心位置を確認せよ！");
  if(Math.abs(rect.cav_widthX - rect.delta.x * nCavWX) > eps) alert("cavity横幅を確認せよ！");
  if(Math.abs(rect.cav_widthY - rect.delta.y * nCavWY) > eps) alert("cavity高さを確認せよ！");
  rect.sizeY0 = rect.size.y - rect.cav_widthY;//ダクト入出力端の幅（高さ）
//console.log(" sizeY0 = " + rect.sizeY0 + " widthX = " + rect.cav_widthX + " nCavWX = " + nCavWX); 

  var i,j;
  for(i = 0; i <= rect.nMeshX; i++)
  {//配列の2次元化
    type[i] = [];
    Psi[i] = [];
    Phi[i] = [];
    VelX[i] = [];
    VelY[i] = [];
  }

  //格子点のタイプ
  for(j = 0; j <= rect.nMeshY; j++)
  {
	for(i = 0; i <= rect.nMeshX; i++)
    {
	  type[i][j] = "INSIDE";//内点
	  if(j == 0) type[i][j] = "BOTTOM";//下側壁面
	  if(i == 0 && j < nMeshY0) type[i][j] = "INLET";//流入端
	  if(i == rect.nMeshX && j < nMeshY0) type[i][j] = "OUTLET";//流出端 
	  if(j == nMeshY0 && i < nMeshX1 ) type[i][j] = "TOP";//上側壁面
	  if(j == nMeshY0 && i > nMeshX2 ) type[i][j] = "TOP";//上側壁面
	  if(i == nMeshX1 && j > nMeshY0) type[i][j] = "CAV_LEFT";//Cavity左端
	  if(i > nMeshX1 && i < nMeshX2 && j == rect.nMeshY) type[i][j] = "CAV_TOP";//Cavity上端
	  if(i == nMeshX2 && j > nMeshY0) type[i][j] = "CAV_RIGHT";//Cavity右端
	  if((i < nMeshX1 || i > nMeshX2) && j > nMeshY0) type[i][j] = "OBSTACLE";//障害物内部
	  //コーナー
	  if(i == nMeshX1 && j == nMeshY0) type[i][j] = "CAV_DR";
	  if(i == nMeshX1 && j == rect.nMeshY) type[i][j] = "CAV_DR";
	  if(i == nMeshX2 && j == nMeshY0) type[i][j] = "CAV_DL";
	  if(i == nMeshX2 && j == rect.nMeshY) type[i][j] = "CAV_DL";
	}
  }
}

function calculatePsi()
{  
  var i, j, k;
  //境界条件と内部格子点の初期条件
  for(j = 0; j <= rect.nMeshY; j++)
  {
    for(i = 0; i <= rect.nMeshX; i++)
	{
	  if(type[i][j] == "BOTTOM") Psi[i][j] = 0;
	  if(type[i][j] == "TOP" || type[i][j] == "CAV_LEFT" || type[i][j] == "CAV_TOP" || type[i][j] == "CAV_RIGHT")
         Psi[i][j] = rect.sizeY0;//一様流れの流速を1とする
	  else Psi[i][j] = j * rect.delta.y;//内点および入口・出口は線形補間
	}
  }

  //差分法
  var cnt = 0;
  var error = 0.0;
  var maxError = 0.0;
  var dx2 = rect.delta.x * rect.delta.x ;
  var dy2 = rect.delta.y * rect.delta.y ;
  var pp;
  
  while (cnt < iteration)
  {
    maxError = 0.0;
    for (j = 1; j < rect.nMeshY; j++)
    {
	  for (i = 1; i < rect.nMeshX; i++)
	  {
        if(type[i][j] != "INSIDE") continue;
		pp = dy2 * (Psi[i-1][j] + Psi[i+1][j])
           + dx2 *( Psi[i][j-1] + Psi[i][j+1]);
		pp /= 2.0 * (dx2 + dy2);
		error = Math.abs(pp - Psi[i][j]);
		if (error > maxError) maxError = error;
		Psi[i][j] = pp;
	  }
    }
	if (maxError < tolerance) break;
	cnt++;
  }
console.log("AAA cnt = " + cnt + " maxError = "+ maxError);

  //速度ベクトルの計算
  //格子点の速度ベクトル(上下左右の流れ関数の差で求める)
  for (j = 1; j < rect.nMeshY; j++)
	for(i = 1; i < rect.nMeshX; i++)
	{ 
	  if(type[i][j] == "OBSTACLE") continue;
	  if(type[i][j] == "CAV_LEFT") continue;
	  if(type[i][j] == "CAV_RIGHT") continue;
      VelX[i][j] = 0.5 * (Psi[i][j+1] - Psi[i][j-1]) / rect.delta.y;
	  VelY[i][j] = 0.5 * (Psi[i-1][j] - Psi[i+1][j]) / rect.delta.x;
	  VelX[0][j] = 1; VelY[0][j] = 0; //始点（左端）	  
	}
}

function calculatePhi()
{  
  var i, j, k;
  //境界条件と内部格子点の初期条件
  for(j = 0; j <= rect.nMeshY; j++)
  {
    for(i = 0; i <= rect.nMeshX; i++)
	{
	  k = i + j * (rect.nMeshX + 1);
	  if(type[i][j] == "INLET") Phi[i][j] = 0.0;
	  else if(type[i][j] == "OUTLET") Phi[i][j] = rect.size.x;
	  else Phi[i][j] = i * rect.delta.x;
    }
  }
 
  //差分法
  var cnt = 0;
  var error = 0.0;
  var maxError = 0.0;
  var dx2 = rect.delta.x * rect.delta.x ;
  var dy2 = rect.delta.y * rect.delta.y ;
  var pp;
  while (cnt < iteration)
  {
    //Neumann boundary condition
    for(j = 0; j <= rect.nMeshY; j++)
    {
      for(i = 1; i < rect.nMeshX; i++)
      {
        if(type[i][j] == "TOP") Phi[i][j] = Phi[i][j-1];
		else if(type[i][j] == "BOTTOM")   Phi[i][j] = Phi[i][1];
		else if(type[i][j] == "CAV_LEFT") Phi[i][j] = Phi[i+1][j];
		else if(type[i][j] == "CAV_TOP")  Phi[i][j] = Phi[i][j-1];
		else if(type[i][j] == "CAV_RIGHT") Phi[i][j] = Phi[i-1][j];
		else if(type[i][j] == "CAV_DL") Phi[i][j] = Phi[i-1][j-1];
		else if(type[i][j] == "CAV_DR") Phi[i][j] = Phi[i+1][j-1];
	  }
    }
  
    maxError = 0.0;
    for (j = 1; j < rect.nMeshY; j++)
    {
	  for (i = 1; i < rect.nMeshX; i++)
	  {
        if(type[i][j] != "INSIDE") continue;
		pp = dy2 * (Phi[i-1][j] + Phi[i+1][j])
           + dx2 *( Phi[i][j-1] + Phi[i][j+1]);
		pp /= 2.0 * (dx2 + dy2);
		error = Math.abs(pp - Phi[i][j]);
		if (error > maxError) maxError = error;
		Phi[i][j] = pp;
	  }
    }
	if (maxError < tolerance) break;
	cnt++;
  }
console.log("BBB cnt = " + cnt + " maxError = "+ maxError );

  gl.clear(gl.COLOR_BUFFER_BIT);
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
  if( flagStream ) drawContour(Psi, "blue", range);
  if( flagPotential ) drawContour(Phi, "red", 2 * range); 
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
  
  //ダクトの壁
  drawLine(rect.left0.x, rect.left0.y, rect.left0.x + scale.x * rect.size.x, rect.left0.y, 2, "black");//底
  drawLine(rect.left0.x, rect.left0.y + rect.sizeY0 * scale.y, rect.left0.x + rect.cav_left*scale.x, rect.left0.y + rect.sizeY0 * scale.y, 2, "black");
  drawLine(rect.left0.x + rect.cav_right*scale.x, rect.left0.y + rect.sizeY0 * scale.y, rect.left0.x + rect.size.x*scale.x, rect.left0.y + rect.sizeY0 * scale.y, 2, "black");
  drawLine(rect.left0.x + rect.cav_left*scale.x, rect.left0.y + rect.size.y * scale.y, rect.left0.x + rect.cav_right*scale.x, rect.left0.y + rect.size.y * scale.y, 2, "black");
  drawLine(rect.left0.x + rect.cav_left*scale.x, rect.left0.y + rect.sizeY0 * scale.y, rect.left0.x + rect.cav_left*scale.x, rect.left0.y + rect.size.y * scale.y, 1, "black");
  drawLine(rect.left0.x + rect.cav_right*scale.x, rect.left0.y + rect.sizeY0 * scale.y, rect.left0.x + rect.cav_right*scale.x, rect.left0.y + rect.size.y * scale.y, 1, "black");

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

function drawContour(PP, col, maxP)
{
  nLine = parseFloat(form2.nLine.value);
  range = parseFloat(form2.range.value);
  
//  var maxP = range;
  var minP =0;
  var dp0 = (maxP - minP) / nLine;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, m;
  var k0, k1, k2, k3;
  var data = [];
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0;
    for(j = 0; j < rect.nMeshY; j++)
	{
      for(i = 0; i < rect.nMeshX; i++)
	  { //三角形セルに分割
        //1つでも内点なら描画
	    if( type[i][j] != "INSIDE" && type[i][j+1] != "INSIDE" 
	     && type[i+1][j+1] != "INSIDE" && type[i+1][j] != "INSIDE" ) continue;

	    p[0] = PP[i][j]; x[0] = i * rect.delta.x;         y[0] = j * rect.delta.y;
	    p[1] = PP[i][j+1]; x[1] = i * rect.delta.x;       y[1] = (j+1) * rect.delta.y;
	    p[2] = PP[i+1][j+1]; x[2] = (i+1) * rect.delta.x; y[2] = (j+1) * rect.delta.y;
	    p[3] = PP[i+1][j]; x[3] = (i+1) * rect.delta.x;   y[3] = j * rect.delta.y;
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
  var nGridX = rect.nMeshX + 1;
  var i, j, k;

  //描画
  var theta, mag, x0, y0;
  for(i = 1; i < rect.nMeshX; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j < rect.nMeshY; j++)
	{
	  if(j % intervalV != 0) continue;
	  k = i + j * nGridX;
	  if(type[i][j] == "OBSTACLE") continue;
	  if(type[i][j] == "CAV_LEFT") continue;	  
      if(type[i][j] == "CAV_RIGHT") continue;
	  if(type[i][j] == "CAV_TOP") continue;
	  mag = Math.sqrt(VelX[i][j] * VelX[i][j] + VelY[i][j] * VelY[i][j]);
	  if(mag > 10.0) continue;
	  theta = Math.atan2(VelY[i][j], VelX[i][j]);
	  x0 = rect.left0.x + scale.x * i * rect.delta.x;
      y0 = rect.left0.y + scale.y * j * rect.delta.y;
	  drawArrow(x0, y0, mag * arrowScale, arrowWidth, "black", theta);
	}
  }
}


function drawGrid()
{
  var i, j;
  for(i = 1; i < rect.nMeshX; i++)
  {
    drawLine(rect.left0.x + scale.x * i * rect.delta.x, rect.left0.y,
      rect.left0.x + scale.x * i * rect.delta.x, rect.left0.y + scale.y * rect.size.y, 1, "black");
  }
  for(j = 1; j < rect.nMeshY; j++)
  {
    drawLine(rect.left0.x, rect.left0.y + scale.y * j * rect.delta.y,
     rect.left0.x + scale.x * rect.size.x, rect.left0.y + scale.y * j * rect.delta.y, 1, "black");
  }
}

//-----------------------------------------------------------------
function Particle2D()
{
  this.pos = new Vector3();
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
  //粒子インスタンス
  for(var i = 0; i < numMaxP; i++)　pa[i] = new Particle2D();
}

function drawParticle(dt)
{
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
//if(k < 10) console.log("k = " + k + " v.x = " + vel.x + " y = " + vel.y);

	if(!flagFreeze) {
      pa[k].pos.x += vel.x * dt * speedCoef;
      pa[k].pos.y += vel.y * dt * speedCoef;
    }
//if(k < 10) console.log("k = " + k + " x = " + pa[k].pos.x + " y = " + pa[k].pos.y);
	if(pa[k].pos.x >= 0.0 && pa[k].pos.x < rect.size.x 
			&& pa[k].pos.y >= 0.0 && pa[k].pos.y < rect.size.y) 
    { 
      dataP[2*K] = rect.left0.x + pa[k].pos.x * scale.x; 
      dataP[2*K+1] = rect.left0.y + pa[k].pos.y * scale.y; 
//console.log(" K= " + K + " x = " + dataP[2*K] + " y = " + dataP[2*K+1]);
      K++;
    }
    else{
      if( countPeriod == 0) createParticle(k); 
    }
  }

  drawPoints(dataP, sizeP, typeP, "black");
  
  if(countP > numMaxP - num0) countP = 0;
  
  countPeriod += dt;
  if(countPeriod > period){
    countPeriod = 0;
  }
}

function createParticle(k)
{
  pa[k].pos.x = 0.01;//左端(left0)からの位置
  pa[k].pos.y = getRandom(0, rect.sizeY0);
}

function getVelocityParticle(pos)
{
  var vel = new Vector3();

  var i, j, I, J;
  var nGridX = rect.nMeshX + 1;

  //格子番号を取得
  I = 0; J = 0;
  for(i = 0; i < rect.nMeshX; i++)
  {
	if(i * rect.delta.x < pos.x && (i+1) * rect.delta.x > pos.x) I = i;
  }
  for(j = 0; j < rect.nMeshY; j++)
  {
 	if(j * rect.delta.y < pos.y && (j+1) * rect.delta.y > pos.y) J = j;
  }
//console.log(" x = " + pos.x + " y = " + pos.y + " I = " + I + " J = " + J);
  var a =  pos.x / rect.delta.x - I;
  var b =  pos.y / rect.delta.y - J;
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
  init();
  calculatePsi();
  calculatePhi();
  display();
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
 
function onChangeMaxV()
{
  maxVelocity = parseFloat(form2.maxVelocity.value);
  var maxVel2 = maxVelocity * maxVelocity;//圧力計算時に必要
  var nGridX = rect.nMeshX + 1;
  for (j = 0; j < rect.nMeshY; j++)
	for(i = 0; i < rect.nMeshX; i++)
	{ 
      k = i + j * nGridX;
      Press[k] = 1.0 - (VelX[k]*VelX[k] + VelY[k]*VelY[k]) / maxVel2;
      if(Press[k] < 0.0) Press[0] = 0.0;
//if(i < 5 && j > 5 && j < 9) console.log("i = " + i + " j = " + j + " k = " + k + " Vel.x = " + VelX[k] + " Vel.y = " + VelY[k]);
	}
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



