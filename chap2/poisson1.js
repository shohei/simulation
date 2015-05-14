/*----------------------------------------------
     poisson1.js
     速度ポテンシャルのポアソン方程式を差分法で解く
     ポテンシャルのカラー表示
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//速度ポテンシャル
var Phi = [];
var gPhi = [];
var Psi = [];
var VelX = [];//速度
var VelY = [];
var Q_value = 100;
var Radius = 0.05;
var type = [];//格子点のタイプ
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagPotential = true;
var flagStream = true;
var flagVelocity = false;
var flagColor = false;
var flagGrid = false;
var nLine = 20;//流線,ポテンシャルの表示本数
var range = 1;//その範囲(ポテンシャルの最大は2）
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

//解析領域矩形構造体
function Rect()
{
  this.scale = 1.7;//表示倍率
  this.nMeshX = 100;//x方向割数（固定）
  this.nMeshY = 50; //y方向分割数（固定）
  this.size = new Vector3(2, 1, 0);//矩形ダクト領域のサイズ（固定）
  this.left0 = new Vector3(-1, -1, 0);//その左下位置
  this.delta = new Vector3(); //格子間隔
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
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.range.value = range;
  form2.phi.checked = flagPotential;
  form2.psi.checked = flagStream;
  
  init();
  display();

}

function init()
{
  Q_value = parseFloat(form2.Q_value.value);
  Radius = parseFloat(form2.Radius.value);
  rect.delta.x = rect.size.x / rect.nMeshX;//格子間隔
  rect.delta.y = rect.size.y / rect.nMeshY;
  
  var i,j;
  for(i = 0; i <= rect.nMeshX; i++)
  {//配列の2次元化
    type[i] = [];
    Psi[i] = [];
    Phi[i] = [];
    gPhi[i] = [];
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
	  if(j == rect.nMeshY) type[i][j] = "TOP";//上側壁面
	  if(i == 0) type[i][j] = "INLET";//流入端
	  if(i == rect.nMeshX) type[i][j] = "OUTLET";//流出端
	}
  }

  //境界条件と内部格子点の初期条件
  for(j = 0; j <= rect.nMeshY; j++)
  {
    for(i = 0; i <= rect.nMeshX; i++)
	{
	  if(type[i][j] == "INLET") Phi[i][j] = 0.0;
	  else if(type[i][j] == "OUTLET") Phi[i][j] = rect.size.x;
	  else Phi[i][j] = i * rect.delta.x;
    }
  }
  //既知関数(ポアソン方程式の右辺）
  //湧き出し吸い込み点
  var i0 = rect.nMeshX / 2; 
  var j0 = rect.nMeshY / 2;
  var dist, x, y;
  for(j = 0; j <= rect.nMeshY; j++) 
    for(i = 0; i <= rect.nMeshX; i++)
    {
	  x = (i - i0) * rect.delta.x;
      y = (j - j0) * rect.delta.y;
	  dist = Math.sqrt(x * x + y * y);//中心からの距離
      if(dist < Radius){
      gPhi[i][j] = Q_value;
	}
	else gPhi[i][j] = 0.0;
  }
  calculate();
}

function calculate()
{  
  //差分法
  var iteration = 5000;//最大繰り返し回数
  var tolerance = 0.00001;//0.000001;//許容誤差

  var cnt = 0, i, j;
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
		else if(type[i][j] == "BOTTOM")   Phi[i][j] = Phi[i][j+1];
	  }
    }
  
    maxError = 0.0;
    for (j = 1; j < rect.nMeshY; j++)
    {
	  for (i = 1; i < rect.nMeshX; i++)
	  {
        if(type[i][j] != "INSIDE") continue;
		pp = dy2 * (Phi[i-1][j] + Phi[i+1][j])
           + dx2 *( Phi[i][j-1] + Phi[i][j+1])
            -dx2 * dy2 * gPhi[i][j];
		pp /= 2.0 * (dx2 + dy2);
		error = Math.abs(pp - Phi[i][j]);
		if (error > maxError) maxError = error;
		Phi[i][j] = pp;
	  }
    }
	if (maxError < tolerance) break;
	cnt++;
  }
console.log("cnt = " + cnt + " maxError = "+ maxError );
	//速度ベクトルの計算
	//格子点の速度ベクトル(上下左右の速度ポテンシャルの差で求める)
  for (j = 0; j <= rect.nMeshY; j++)
	for(i = 1; i < rect.nMeshX; i++)
	{ 
      VelX[i][j] = 0.5 * (Phi[i+1][j] - Phi[i-1][j]) / rect.delta.x;
      VelY[i][j] = 0.5 * (Phi[i][j+1] - Phi[i][j-1]) / rect.delta.y;
      VelX[0][j] = 1; VelY[0][j] = 0; 
      VelX[rect.nMeshX][j] = 1;//rect.size.x;
      VelY[rect.nMeshX][j] = 0; 
      VelY[i][0] = 0; 
      VelY[i][rect.nMeshY] = 0;
	}
	
  //Psiの境界条件
  for(j = 0; j <= rect.nMeshY; j++)
	for(i = 0; i <= rect.nMeshX; i++)
	{
	  if(type[i][j] == "BOTTOM") Psi[i][j] = 0.0;
	  else if(type[i][j] == "TOP")  Psi[i][j] = rect.size.y;//一様流れの流速を1とする
	  else
	  {//入口・出口は線形補間
	    if(i == 0 || i == rect.nMeshX)  Psi[i][j] = j * rect.delta.y;
	  }
	}

  //y方向速度から流れ関数を求める
  for(j = 1; j < rect.nMeshY; j++)
    for(i = 1; i <= rect.nMeshX; i++){
	{  
      Psi[i][j] = Psi[i-1][j] 
                - (VelY[i][j] + VelY[i-1][j]) * rect.delta.x / 2.0;
    }
  }

  display(); 
}

function display()
{
  flagPotential = form2.phi.checked;
  flagStream = form2.psi.checked;
  flagVelocity = form2.velocity.checked;
  flagColor = form2.p_color.checked;
  flagGrid = form2.grid.checked;
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  drawRegion();//計算領域描画

  if( flagColor) drawPotentialColor();
  if( flagPotential ) drawContour(Phi, "red", range * 2);
  if( flagStream ) drawContour(Psi, "blue", range);
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
  //ダクトの壁
  drawLine(rect.left0.x, rect.left0.y, rect.left0.x + scale.x * rect.size.x, rect.left0.y, 2, "black");
  drawLine(rect.left0.x, rect.left0.y + rect.size.y * scale.y, rect.left0.x + scale.x * rect.size.x, rect.left0.y + rect.size.y * scale.y, 2, "black");
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
  //障害物
  var x_obs = rect.left0.x + rect.obs_x0 * scale.x;
  var y_obs = rect.left0.y + (rect.obs_widthY/2) * scale.y; 
  drawRectangle(x_obs, y_obs, rect.obs_widthX * scale.x, rect.obs_widthY * scale.y, true, "light_gray", 0);

}

function drawContour(PP, col, maxP)
{
  nLine = parseFloat(form2.nLine.value);
  range = parseFloat(form2.range.value);
  
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
  var i, j, k;

  //描画
  var theta, mag, x0, y0;
  for(i = 1; i < rect.nMeshX; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j < rect.nMeshY; j++)
	{
	  if(j % intervalV != 0) continue;
	  if(type[i][j] == "OBSTACLE") continue;
	  if(type[i][j] == "OBS_LEFT") continue;	  
      if(type[i][j] == "OBS_RIGHT") continue;
	  if(type[i][j] == "OBS_TOP") continue;

	  mag = Math.sqrt(VelX[i][j] * VelX[i][j] + VelY[i][j] * VelY[i][j]);
	  if(mag > 10.0) continue;
	  theta = Math.atan2(VelY[i][j], VelX[i][j]);// * RAD_TO_DEG;
	  x0 = rect.left0.x + scale.x * i * rect.delta.x;
      y0 = rect.left0.y + scale.y * j * rect.delta.y;
	  drawArrow(x0, y0, mag * arrowScale, arrowWidth, "black", theta);
	}
  }
}

function drawPotentialColor()
{
  var mv = rect.size.x;//ポテンシャル最大値
  var i, j, k, count;
  var pos = [];
  for(i = 0; i < 4; i++) pos[i] = new Vector3(); 
  var pp = [], rr = [], gg = [], bb = [], xx = [], yy = [];
  var vertices = [];
  var colors = [];

  for (i = 0; i < rect.nMeshX; i++)
  {
    for (j = 0; j < rect.nMeshY; j++)
    {
      pos[0].x = i * rect.delta.x;     pos[0].y = j * rect.delta.y;
	  pos[1].x = (i+1) * rect.delta.x; pos[1].y = j * rect.delta.y;
	  pos[2].x = (i+1) * rect.delta.x; pos[2].y = (j+1) * rect.delta.y;
      pos[3].x = i * rect.delta.x;     pos[3].y = (j+1) * rect.delta.y;

      pp[0] = Phi[i][j] / mv; pp[1] = Phi[i+1][j] / mv; 
      pp[2] = Phi[i+1][j+1] / mv; pp[3] = Phi[i][j+1] / mv;
      //圧力-色変換
      for(k = 0; k < 4; k++)
      {
		if(pp[k] < 0.25)
		{
		  rr[k] = 0.0; gg[k] = 4.0 * pp[k]; bb[k] = 1.0;
        }
		else if(pp[k] < 0.5)
		{
		  rr[k] = 0.0; gg[k] = 1.0; bb[k] = 4.0 * (0.5 - pp[k]);
		}
		else if(pp[k] < 0.75)
		{
		  rr[k] = 4.0 * (pp[k] - 0.5); gg[k] = 1.0; bb[k] = 0.0;
		}
		else
		{
		  rr[k] = 1.0; gg[k] = (1.0 - pp[k]) * 4.0; bb[k] = 0.0;
		}
      }

      for(k = 0; k < 4; k++)
      {
        xx[k] = rect.left0.x + scale.x * pos[k].x;
        yy[k] = rect.left0.y + scale.y * pos[k].y;
      }
      //四角形（三角形2個分のデータ）
      vertices.push(xx[0]); vertices.push(yy[0]);
      vertices.push(xx[1]); vertices.push(yy[1]);
      vertices.push(xx[2]); vertices.push(yy[2]);
      vertices.push(xx[0]); vertices.push(yy[0]);
      vertices.push(xx[2]); vertices.push(yy[2]);
      vertices.push(xx[3]); vertices.push(yy[3]);
      colors.push(rr[0]); colors.push(gg[0]); colors.push(bb[0]); 
      colors.push(rr[1]); colors.push(gg[1]); colors.push(bb[1]); 
      colors.push(rr[2]); colors.push(gg[2]); colors.push(bb[2]); 
      colors.push(rr[0]); colors.push(gg[0]); colors.push(bb[0]); 
      colors.push(rr[2]); colors.push(gg[2]); colors.push(bb[2]); 
      colors.push(rr[3]); colors.push(gg[3]); colors.push(bb[3]); 
    }
  }
  drawRectangles(vertices, colors);
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
  calculate();
  display();
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



