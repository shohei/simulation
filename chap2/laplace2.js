/*----------------------------------------------
     laplace2.js
     速度ポテンシャルのラプラス方程式を差分法で解く
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//速度ポテンシャル
var Phi = [];
var VelX = [];//速度
var VelY = [];
var type = [];//格子点のタイプ
var scale = new Vector3(1.0, 1.0, 0.0);//スケール調整

var flagPotential = true;
var flagVelocity = false;
var flagGrid = false;
var nLine = 20;//流線,ポテンシャルの表示本数
var range = 2;//その範囲(ポテンシャルの最大は2）
var arrowScale = 0.05;
var arrowWidth = 1;
var intervalV = 2;//速度矢印表示間隔

//解析領域矩形構造体
function Rect()
{
  this.scale = 1.5;//表示倍率
  this.nMeshX = 100;//x方向割数（固定）
  this.nMeshY = 50; //y方向分割数（固定）
  this.size = new Vector3(2, 1, 0);//矩形ダクト領域のサイズ（固定）
  this.left0 = new Vector3(-1, -1, 0);//その左下位置
  this.delta = new Vector3(); //格子間隔
  this.obs_x0 = 0.8;  //左端から障害物中心までの距離
  this.obs_left = 0.6;//左端から障害物左端までの距離
  this.obs_widthX = 0.4;//障害物の厚さ(ｘ方向）
  this.obs_widthY = 0.5; //障害物の幅(ｙ方向)
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
  form2.obsX0.value = rect.obs_x0;
  form2.obsWX.value = rect.obs_widthX;
  form2.obsWY.value = rect.obs_widthY;
  form2.scale.value = rect.scale;
  form2.nLine.value = nLine;
  form2.range.value = range;
  form2.phi.checked = flagPotential;
  
  init();
  display();

}

function init()
{
  rect.obs_x0 = parseFloat(form2.obsX0.value);
  rect.obs_widthX = parseFloat(form2.obsWX.value);
  rect.obs_widthY = parseFloat(form2.obsWY.value);

  var i, j;
  var eps = 0.000001;

  rect.delta.x = rect.size.x / rect.nMeshX;//格子間隔
  rect.delta.y = rect.size.y / rect.nMeshY;
  rect.obs_left = rect.obs_x0 - rect.obs_widthX / 2;
  var nMeshX0 = Math.floor((rect.obs_x0+eps) / rect.delta.x);
  var nMeshX1 = Math.floor((rect.obs_left+eps) / rect.delta.x);
  var nMeshX2 = Math.floor((rect.obs_left + rect.obs_widthX + eps) / rect.delta.x);
  var nObsWX = nMeshX2 - nMeshX1;
  var nObsWY = Math.floor((rect.obs_widthY+eps) / rect.delta.y);
  if(Math.abs(rect.obs_x0 - rect.delta.x * nMeshX0) > eps) alert("障害物中心位置を確認せよ！");
  if(Math.abs(rect.obs_widthX - rect.delta.x * nObsWX) > eps) alert("障害物横幅を確認せよ！");
  if(Math.abs(rect.obs_widthY - rect.delta.y * nObsWY) > eps) alert("障害物高さを確認せよ！");
  
  for(i = 0; i <= rect.nMeshX; i++)
  {//配列の2次元化
    type[i] = [];
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
	  if(j == rect.nMeshY) type[i][j] = "TOP";//上側壁面
	  if(i == 0) type[i][j] = "INLET";//流入端
	  if(i == rect.nMeshX) type[i][j] = "OUTLET";//流出端
	  if(i == nMeshX1 && j < nObsWY) type[i][j] = "OBS_LEFT";//障害物左端
	  if(i >= nMeshX1 && i <= nMeshX2 && j == nObsWY) type[i][j] = "OBS_TOP";//障害物上端
	  if(i == nMeshX2 && j < nObsWY) type[i][j] = "OBS_RIGHT";//障害物右端
	  if(i > nMeshX1 && i < nMeshX2 && j < nObsWY) type[i][j] = "OBSTACLE";//障害物内部
	  //コーナー（追加分）
	  if(i == nMeshX1 && j == 0) type[i][j] = "CORNER_UL";
	  if(i == nMeshX1 && j == nObsWY)  type[i][j] = "CORNER_UL";
	  if(i == nMeshX2 && j == 0) type[i][j] = "CORNER_UR";
	  if(i == nMeshX2 && j == nObsWY) type[i][j] = "CORNER_UR";
	}
  }
  calculate();
}

function calculate()
{  
  var i, j;
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
  //差分法
  var iteration = 5000;//最大繰り返し回数
  var tolerance = 0.00001;//許容誤差

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
		else if(type[i][j] == "BOTTOM")   Phi[i][j] = Phi[i][j+1];
		else if(type[i][j] == "OBS_LEFT") Phi[i][j] = Phi[i-1][j];
		else if(type[i][j] == "OBS_TOP")  Phi[i][j] = Phi[i][j+1];
		else if(type[i][j] == "OBS_RIGHT") Phi[i][j] = Phi[i+1][j];
		else if(type[i][j] == "CORNER_UL")  Phi[i][j] = Phi[i-1][j+1];
		else if(type[i][j] == "CORNER_UR")  Phi[i][j] = Phi[i+1][j+1];
	  }
    }
  
    maxError = 0.0;
    for (j = 1; j < rect.nMeshY; j++)
    {
	  for (i = 1; i < rect.nMeshX; i++)
	  {
        if(type[i][j] != "INSIDE") continue;
		pp = dy2 * (Phi[i-1][j] + Phi[i+1][j]) + dx2 *( Phi[i][j-1] + Phi[i][j+1]);
		pp /= 2.0 * (dx2 + dy2);
		error = Math.abs(pp - Phi[i][j]);
		if (error > maxError) maxError = error;
		Phi[i][j] = pp;
	  }
    }
	if (maxError < tolerance) break;
	cnt++;
  }
  alert("cnt = " + cnt + " maxError = "+ maxError );

  //格子点の速度ベクトル(上下左右の速度ポテンシャルの差で求める)
  for (j = 1; j < rect.nMeshY; j++)
	for(i = 1; i < rect.nMeshX; i++)
	{ 
	  if(type[i][j] == "OBSTACLE") continue;
      VelX[i][j] = 0.5 * (Phi[i+1][j] - Phi[i-1][j]) / rect.delta.x;
	  VelY[i][j] = 0.5 * (Phi[i][j+1] - Phi[i][j-1]) / rect.delta.y;
	}
  display();
}

function display()
{
  flagPotential = form2.phi.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  height_per_width = canvas.height / canvas.width;//縦横の比率を一定にするための係数
	
  //計算領域描画
  drawRegion();

  if( flagPotential ) drawContour(Phi, "red");
  if( flagVelocity ) drawVelocity();
  if( flagGrid ) drawGrid();
  //ダクトの壁
  drawLine(rect.left0.x, rect.left0.y, rect.left0.x + scale.x * rect.size.x, rect.left0.y, 2, "black");
  drawLine(rect.left0.x, rect.left0.y + rect.size.y * scale.y, rect.left0.x + scale.x * rect.size.x, rect.left0.y + rect.size.y * scale.y, 2, "black");
  //障害物
  var x_obs = rect.left0.x + (rect.obs_left + rect.obs_widthX/2) * scale.x; 
  var y_obs = rect.left0.y + (rect.obs_widthY/2) * scale.y; 
  drawRectangle(x_obs, y_obs, rect.obs_widthX * scale.x, rect.obs_widthY * scale.y, true, "light_gray", 0);
  //枠
  drawLine(rect.left0.x + rect.obs_left*scale.x, rect.left0.y, rect.left0.x + rect.obs_left*scale.x, rect.left0.y + rect.obs_widthY * scale.y, 1, "black");
  drawLine(rect.left0.x + (rect.obs_left+rect.obs_widthX)*scale.x, rect.left0.y, rect.left0.x + (rect.obs_left+rect.obs_widthX)*scale.x, rect.left0.y + rect.obs_widthY * scale.y, 1, "black");
  drawLine(rect.left0.x + rect.obs_left*scale.x, rect.left0.y + rect.obs_widthY * scale.y, rect.left0.x + (rect.obs_left+rect.obs_widthX)*scale.x, rect.left0.y + rect.obs_widthY * scale.y, 1, "black");
   
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

function drawContour(PP, col)
{
  nLine = parseFloat(form2.nLine.value);
  range = parseFloat(form2.range.value);
  
  var maxP = range;
  var minP =0;
  var dp0 = (maxP - minP) / nLine;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, k, m;
//  var k0, k1, k2, k3;
  var data = [];
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0;
    //data = []; 
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



