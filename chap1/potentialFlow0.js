/*----------------------------------------------
     potentialFlow0.js
     ポテンシャル流れ
     一様流れ+湧き出し+渦
-----------------------------------------------*/
var canvas; //キャンバス要素
var gl;//WebGL描画用コンテキスト
var height_per_width;//キャンバスのサイズ比
//ポテンシャル流れ
var Phi = [];//ポテンシャル
var Psi = [];//流れ関数
var VelX = [];//速度
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
var alpha = 0;//一様流れの傾斜角
var flowVelocity = 1;//一様流れの流速（固定）
var Q_Value = 1;//湧き出し量
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
  this.size = 2.0;//矩形領域のサイズ(正方形)
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
  display();
}

function calculate()
{  
  //ポテンシャル流れのパラメータ
  flagUniform = form2.Uniform.checked ;
  flagSource = form2.Source.checked ;
  flagVortex = form2.Vortex.checked ;

  rect.nMesh = parseInt(form2.nMesh.value);
  rect.delta = rect.size / rect.nMesh;
  alpha = parseFloat(form2.alpha.value);
  Q_Value = parseFloat(form2.Q_Value.value);
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
  var r2 = 0.0;
  var rad0 = 0.001;
  var ang = alpha * DEG_TO_RAD;
  var mag;

  for (i = 0; i <= rect.nMesh; i++)
  {
    z.x = rect.delta * (i - rect.nMesh / 2);//中心のポテンシャルを0
    for (j = 0; j <= rect.nMesh; j++)
    {
      z.y = rect.delta * (j - rect.nMesh / 2);

      if(flagUniform) 
      {
	    Phi[i][j] = flowVelocity * (z.x * Math.cos(ang) + z.y * Math.sin(ang));
		Psi[i][j] = flowVelocity * (z.y * Math.cos(ang) - z.x * Math.sin(ang));
		VelX[i][j] = flowVelocity * Math.cos(ang);
		VelY[i][j] = flowVelocity * Math.sin(ang);
      }

	  if (flagSource)//湧き出し(吸い込み）
      {
        if(z.x == 0 && z.y == 0)
        {//原点は対数的特異点
          z.x = rect.delta / 1000.0;
          z.y = rect.delta / 1000.0;
        }
        r2 = mag2(z); 
        if(r2 < rad0) r2 = rad0;
        Phi[i][j] += Q_Value * Math.log(r2) / (4.0 * Math.PI);
        Psi[i][j] += Q_Value * Math.atan2(z.y, z.x) / (2.0 * Math.PI);
		VelX[i][j] += Q_Value * z.x / r2 / (2.0 * Math.PI);
		VelY[i][j] += Q_Value * z.y / r2 / (2.0 * Math.PI);
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
  display();
}

function display()
{
  flagPotential = form2.phi.checked;
  flagStream = form2.psi.checked;
  flagVelocity = form2.velocity.checked;
  flagGrid = form2.grid.checked;
  
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
      
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
  var sy = scale.y * rect.size / 2;//表示領域の高さは2*sy
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
  
  var maxP =  flowVelocity * range;
  var minP = -flowVelocity * range;
  var dp0 = (maxP - minP) / nLine;//+0.00001;//流線間隔
  var pp;
  var x1, y1, x2, y2;
  var p = [], x = [], y = [];
  var i, j, k, m;
  var data = [];
 	
  //三角形セルに分割
  for (k = 0; k < nLine; k++)
  {
    pp = minP + (k + 1) * dp0; 
    for(i = 0; i < rect.nMesh; i++)
	{
	  for(j = 0; j < rect.nMesh; j++)
	  {//三角形セルに分割
	    p[0] = PP[i][j]; x[0] = i * rect.delta;     y[0] = j * rect.delta;
	    p[1] = PP[i][j+1]; x[1] = i * rect.delta;     y[1] = (j+1) * rect.delta;
	    p[2] = PP[i+1][j+1]; x[2] = (i+1) * rect.delta; y[2] = (j+1) * rect.delta;
	    p[3] = PP[i+1][j]; x[3] = (i+1) * rect.delta; y[3] = j * rect.delta;
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
  for(i = 1; i < rect.nMesh; i++)
  {
    if(i % intervalV != 0) continue;
    for (j = 1; j < rect.nMesh; j++)
	{
	  if(j % intervalV != 0) continue;
	  mag = Math.sqrt(VelX[i][j] * VelX[i][j] + VelY[i][j] * VelY[i][j]);
	  if(mag > 10.0) continue;
	  theta = Math.atan2(VelY[i][j], VelX[i][j]);
	  x0 = rect.left0.x + scale.x * i * rect.delta;
      y0 = rect.left0.y + scale.y * j * rect.delta;
	  drawArrow(x0, y0, mag * arrowScale, arrowWidth, "black", theta);
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
  calculate();
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



