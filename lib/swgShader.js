/*---------- myGlsl.js -------------------------------
 プログラムオブジェクト(シェーダプログラム）を生成する．
 gl : GLコンテキスト
 vs_source : 頂点シェーダのプログラム(文字列)
 fs_source : フラグメントシェーダのプログラム(文字列)
 プログラムオブジェクトprogramを生成し,成功したらtrueを返す
------------------------------------------------------*/

function initGlsl(gl, vs_source, fs_source) 
{
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  
  gl.shaderSource(vertexShader, vs_source);
  gl.shaderSource(fragmentShader, fs_source);

  // シェーダをコンパイルする
  gl.compileShader(vertexShader);
  gl.compileShader(fragmentShader);

  //プログラムオブジェクトの作成
  var program = gl.createProgram();
  if (!program) 
  {
    alert("プログラムオブジェクトの作成に失敗");
    return false;
  }
  // シェーダオブジェクトを設定する
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // プログラムオブジェクトをリンクする
  gl.linkProgram(program);

  // リンク結果をチェックする
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) 
  {
    var error = gl.getProgramInfoLog(program);
    alert('プログラムオブジェクトのリンクに失敗 ' + error);
    gl.deleteProgram(program);
    gl.deleteShader(fragmentShader);
    gl.deleteShader(vertexShader);
    return false;
  }  
  gl.useProgram(program);
  gl.program = program;
  return true;
}
