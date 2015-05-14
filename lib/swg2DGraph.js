/********************************************************************
    2D描画関数(HTML5の2Dグラフィックス機能）
    呼び出す側のプログラムにおいてコンテキストをctxとすること
*********************************************************************/
//---------------------------------------------------
function drawLine(x1, y1, x2, y2, color, line_width)
{
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = line_width;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
//----------------------------------------------------
function drawLines(pointData, color, line_width)
{
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = line_width;
  ctx.moveTo(pointData[0][0], pointData[0][1]);
  for(var i = 1; i < pointData.length; i++) ctx.lineTo(pointData[i][0], pointData[i][1]);
  ctx.stroke();
}
//----------------------------------------------------------
function drawRect(x0, y0, w, h, fill, color, line_width)
{//x0,y0は中心座標
  var x = x0 - w / 2;
  var y = y0 - h / 2;
  if(fill == 0)
  {
    ctx.lineWidth = line_width; 
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, w, h);
  }
  else
  {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }
}
//----------------------------------------------------------
function drawCircle(x0, y0, radius, fill, color, line_width)
{//x0,y0は中心座標
  ctx.beginPath();
  ctx.arc(x0, y0, radius, 2.0 * Math.PI, false);
  if(fill == 0)
  {
    ctx.lineWidth = line_width; 
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  else
  {
    ctx.fillStyle = color;
    ctx.fill();
  }
}
//-----------------------------------------------------------
function drawTriangle(x0, y0, radius, fill, color, line_width)
{//x0,y0は中心座標, radiusは中心から頂点までの距離
  var rs = radius * Math.sin(Math.PI/6);
  var rc = radius * Math.cos(Math.PI/6);
  var x1 = x0; var y1 = y0 - radius;
  var x2 = x0 - rc; var y2 = y0 + rs;
  var x3 = x0 + rc; var y3 = y2; 
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  if(fill == 0)
  {
    ctx.lineWidth = line_width; 
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  else
  {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

//-----------------------------------------------------------------
function drawText(text, x, y, color, scX, scY)
{
  ctx.fillStyle = color;
  ctx.scale(scX, scY);
  ctx.fillText(text, x / scX, y / scY);
  ctx.scale(1 / scX, 1 / scY);//元のサイズに戻す
}
//----------------------------------------------------------------
function clearCanvas(color)
{
　ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

