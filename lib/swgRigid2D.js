/***************************************************************************************
  swgRigid2D.js
  Rigid2Dクラス
****************************************************************************************/
function Rigid2D()
{
  this.kind = "TRIANGLE";
  this.color = new Float32Array([0.0, 0.0, 0.0, 1.0]);
  this.flagFill = false;
  this.verteces = [];
  this.angle = 0.0;
  this.transX = 0.0;
  this.transY = 0.0;
  this.scaleX = 1.0;
  this.scaleY = 1.0;
}

Rigid2D.prototype.draw = function()
{
  if(this.kind == "TRIANGLE") this.vertices = makeTriangle();
  else if(this.kind == "RECTANGLE") this.vertices = makeRectangle(this.flagFill);
  else if(this.kind == "CIRCLE") this.vertices = makeCircle(this.flagFill);
    
  var hpwLoc = gl.getUniformLocation(gl.program, 'u_hpw');
  gl.uniform1f(hpwLoc, hpw);

  var angLoc = gl.getUniformLocation(gl.program, 'u_angle');
  gl.uniform1f(angLoc, this.angle);
  var transXLoc = gl.getUniformLocation(gl.program, 'u_tx');
  gl.uniform1f(transXLoc, this.transX);
  var transYLoc = gl.getUniformLocation(gl.program, 'u_ty');
  gl.uniform1f(transYLoc, this.transY);
  var scaleXLoc = gl.getUniformLocation(gl.program, 'u_sx');
  gl.uniform1f(scaleXLoc, this.scaleX);
  var scaleYLoc = gl.getUniformLocation(gl.program, 'u_sy');
  gl.uniform1f(scaleYLoc, this.scaleY);
  
  var colLoc = gl.getUniformLocation(gl.program, 'u_color');
  gl.uniform4fv(colLoc, this.color);

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
  //attribute変数の格納場所を取得する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  //vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);

  // a_vertex変数でのバッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(vertexLoc);

  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //図形の描画
  if(this.flagFill == "true")
  {
    if(this.kind == "CIRCLE")
    {//円
      gl.drawArrays(gl.TRIANGLE_FAN, 0, this.vertices.length/2);
    }
    else
    {//三角形と四角形
      gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length/2);
    }
  }   
  else
  {//塗りつぶしなし
    gl.drawArrays(gl.LINE_LOOP, 0, this.vertices.length/2);
  }
}
/****************************************************************
  頂点座標作成
*****************************************************************/  
function makeTriangle() 
{

  var vertices = [//正三角形
    -0.5, -0.288675,  
     0.5, -0.288675,   
     0.0, 0.57735 
  ];
  return vertices;
}

function makeRectangle(flagFill) 
{
  if(flagFill == "true")//塗りつぶし
  {
    var vertices = [
      0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  
      0.5, 0.5,  -0.5,-0.5,   0.5, -0.5
    ];
  }
  else//線画
  {
    var vertices =  [
      0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  0.5, -0.5
    ];
  }
  return vertices;
}

function makeCircle(flagFill)
{
  var nSlice = 10;
  var theta0 = 2.0 * Math.PI / nSlice;
  var theta, x, y;
  var vertices = [];
  if(flagFill == "true")
  {
    vertices[0] = 0.0;  vertices[1] = 0.0; //中心点
    for(var i = 0; i <= nSlice; i++)
    {
     theta = i * theta0;
      x = 0.5 * Math.cos(theta);
      y = 0.5 * Math.sin(theta);
      vertices[2 + i * 2] = x;
      vertices[3 + i * 2] = y;
    }
  }
  else
  {
    for(var i = 0; i < nSlice; i++)
    {
      theta = i * theta0;
      x = 0.5 * Math.cos(theta);
      y = 0.5 * Math.sin(theta);
      vertices[0 + i * 2] = x;
      vertices[1 + i * 2] = y;
    }
  }
  return vertices;
}
