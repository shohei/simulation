/*---------------------------------------------------------------
       Dogクラス
----------------------------------------------------------------*/

var MAXFRAME = 5000;//許容最大コマ数
var MAXKEYFRAME = 5;//最大キーフレーム数

function Dog()
{
  this.numParts = 19;
  this.numJoints = 10;
  
  this.flagDebug = false;
  this.shadow = 0.0;
  
  //Dogの位置・姿勢（root位置）
  this.vPos = new Vector3(0.0, 0.0, 0.0);//仮の位置
  this.vEuler = new Vector3(0.0, 0.0, 0.0);
  this.vSize = new Vector3(1.0, 1.0, 1.0);//全体のスケール変換に使用
  this.q = new Quaternion();//1.0, 1.0, 0.0, 0.0);
  this.angle = 0;
  this.vAxis = new Vector3(0.0, 0.0, 1.0);
  var i;
  this.parts = [];
  for(i = 0; i < this.numParts; i++)
  {
    this.parts[i] = new Rigid_HS();
    this.parts[i].kind = "SUPER";
    this.parts[i].nSlice = 10;
    this.parts[i].nStack = 10;
    this.parts[i].eps1 = 0.8;
    this.parts[i].eps2 = 0.5;
  }
  this.parts[0].diffuse = [0.8, 0.5, 0.2, 1.0];//前胴体
  this.parts[0].ambient = [0.5, 0.3, 0.1, 1.0];
  this.parts[1].diffuse = [0.8, 0.5, 0.2, 1.0];//後胴体
  this.parts[1].ambient = [0.5, 0.3, 0.1, 1.0];
  this.parts[2].diffuse = [0.8, 0.4, 0.2, 1.0];//頭部
  this.parts[2].ambient = [0.5, 0.3, 0.1, 1.0];
  this.parts[3].diffuse = [0.2, 0.2, 0.6, 1.0];//右目
  this.parts[3].ambient = [0.1, 0.1, 0.3, 1.0];
  this.parts[4].diffuse = [0.2, 0.2, 0.6, 1.0];//左目
  this.parts[4].ambient = [0.1, 0.1, 0.3, 1.0];
  this.parts[5].diffuse = [0.8, 0.5, 0.2, 1.0];//右耳
  this.parts[5].ambient = [0.4, 0.3, 0.1, 1.0];
  this.parts[6].diffuse = [0.8, 0.5, 0.2, 1.0];//左耳
  this.parts[6].ambient = [0.4, 0.3, 0.1, 1.0];
  this.parts[7].diffuse = [0.8, 0.4, 0.2, 1.0];//口鼻を付けるparts
  this.parts[7].ambient = [0.5, 0.3, 0.1, 1.0];
  this.parts[8].diffuse = [0.2, 0.2, 0.4, 1.0];//鼻
  this.parts[8].ambient = [0.1, 0.1, 0.2, 1.0];
  this.parts[9].diffuse = [0.6, 0.2, 0.2, 1.0];//口
  this.parts[9].ambient = [0.3, 0.1, 0.1, 1.0];
  for(i = 10; i < 18; i++)
  {//脚
    this.parts[i].diffuse = [0.7, 0.4, 0.3, 1.0];
    this.parts[i].ambient = [0.4, 0.2, 0.2, 1.0];
  }
  this.parts[18].diffuse = [0.7, 0.6, 0.4, 1.0];//尾
  this.parts[18].ambient = [0.4, 0.3, 0.2, 1.0];
    
  //サイズ
  this.vTrunk = new Vector3(1.0, 1.0, 1.0);//胴体(前後共通）
  this.vHead = new Vector3(1.2, 1.2, 1.0);
  this.vEye =  new Vector3(0.2, 0.2, 0.2);
  this.vEar = new Vector3( 0.5, 0.15, 0.4);
  this.vMouthNose = new Vector3(0.6, 0.7, 0.6);//口鼻を付けるパーツのサイズ
  this.vMouth = new Vector3(0.3, 0.3, 0.1);
  this.vNose = new Vector3(0.15, 0.15, 0.2);
  this.vLeg1 = new Vector3(0.3, 0.3, 0.5);//上脚（前脚，後脚)
  this.vLeg2 = new Vector3(0.3, 0.3, 0.3);//下脚（前脚，後脚
  this.vTail = new Vector3( 0.5, 0.3, 0.3);//尾

  //関節
  this.vJoints = [];
  this.vJoints[0] = new Vector3(0.0, 0.0, 0.0);//首
  this.vJoints[1] = new Vector3(0.0, 0.0, 0.0);//前右股関節
  this.vJoints[2] = new Vector3(0.0, 0.0, 0.0);//前右膝関節
  this.vJoints[3] = new Vector3(0.0, 0.0, 0.0);//前左股関節
  this.vJoints[4] = new Vector3(0.0, 0.0, 0.0);//前左膝関節
  this.vJoints[5] = new Vector3(0.0, 0.0, 0.0);//後右股関節
  this.vJoints[6] = new Vector3(0.0, 0.0, 0.0);//後右膝関節
  this.vJoints[7] = new Vector3(0.0, 0.0, 0.0);//後左股関節
  this.vJoints[8] = new Vector3(0.0, 0.0, 0.0);//後左膝関節
  this.vJoints[9] = new Vector3(0.0, 60.0, 0.0);//尾の付け根
 
  this.legLen0 = (0.9 * this.vLeg1.z + this.vLeg2.z);
  this.height0 = (0.3 * this.vTrunk.z + 0.9 * this.vLeg1.z + this.vLeg2.z);// -0.02;
  this.legLen = (0.9 * this.vLeg1.z + this.vLeg2.z);
  this.height = (0.3 * this.vTrunk.z + 0.9 * this.vLeg1.z + this.vLeg2.z);// -0.02;
 
  //animation用
  this.f_vPos = [];
  for(i = 0; i < MAXFRAME; i++) this.f_vPos[i] = new Vector3();
  this.f_vEuler = [];
  for(i = 0; i < MAXFRAME; i++) this.f_vEuler[i] = new Vector3();
  
  this.k_vPos = [];
  for(i = 0; i < MAXKEYFRAME; i++) this.k_vPos[i] = new Vector3();
  this.k_vEuler = [];
  for(i = 0; i < MAXKEYFRAME; i++) this.k_vEuler[i] = new Vector3();
  this.f_vJoints = [];
  for(i = 0; i < MAXFRAME*this.numJoints; i++) this.f_vJoints[i] = new Vector3();
  this.k_vJoints = [];
  for(i = 0; i < MAXKEYFRAME*this.numJoints; i++) this.k_vJoints[i] = new Vector3();
  this.actTime = [];//keyFrame間の動作時間
  this.unitTime;//1フレーム当たりの描画時間
  this.numKeyFrame = 0;//ｷｰﾌﾚｰﾑ数
  this.numFrame = 0;//1つのシーンの全表示ﾌﾚｰﾑ数
}

Dog.prototype.draw = function(gl)
{ 
  for(var i = 0; i < this.numParts; i++)
  {
    this.parts[i].flagDebug = this.flagDebug;
    this.parts[i].shadow = this.shadow;
  }
  var n = this.parts[0].initVertexBuffers(gl);//1種類のプリミティブを使うので1回だけでよい
  
  //スタック行列の確保
  var stackMat = [];
  for(var i = 0; i < 10; i++) stackMat[i] = new Matrix4();
  // モデル行列の初期化
  var modelMatrix = new Matrix4();
  
  if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ
  
  //Webページでスケーリングを行ったとき，脚の長さルートの高さも変更する
  this.legLen = this.legLen0 * this.vSize.z;
  this.height = this.height0 * this.vSize.z;
  //root
  //平行移動
  //modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z + this.height);//vPos.zは足の高さ
  modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z );//2013.7.5変更  
  //回転

  //this.q = q_getQFromEulerXYZ(dog.vEuler);
  if(this.q.s > 1.0) this.q.s = 1.0;  
  if(this.q.s < -1.0) this.q.s = -1.0;
  this.angle = 2.0 * Math.acos(this.q.s);//[rad]
  this.vAxis = norm(getVector(this.q));
  if(this.vAxis.x == 0 && this.vAxis.y == 0 && this.vAxis.z == 0) this.vAxis.x = 1;
  modelMatrix.rotate(this.angle * RAD_TO_DEG, this.vAxis.x, this.vAxis.y, this.vAxis.z); //任意軸回転

  //スケーリング
  modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);
  
  stackMat[0].copy(modelMatrix);//rootのモデル行列を保存
　
  //---------前胴体----------------------
  modelMatrix.translate(0.45 * this.vTrunk.x, 0.0, 0.0);
  stackMat[1].copy(modelMatrix);//前胴体のモデル行列を保存 
  modelMatrix.scale(this.vTrunk.x, this.vTrunk.y, this.vTrunk.z);
  this.parts[0].draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//rootのモデル行列に戻す
  //後胴体
  modelMatrix.translate(-0.4 * this.vTrunk.x, 0.0, 0.0);
  stackMat[2].copy(modelMatrix);//後胴体のモデル行列を保存 
  modelMatrix.scale(this.vTrunk.x, this.vTrunk.y, this.vTrunk.z);
  this.parts[1].draw(gl, n, modelMatrix);

  modelMatrix.copy(stackMat[1]);//前胴体のモデル行列に戻す
  //---------頭部・顔全体-----------------------
　modelMatrix.translate(this.vTrunk.x * 0.4, 0.0, this.vTrunk.z * 0.5 - 0.2);//首関節まで平行移動
  modelMatrix.rotate(this.vJoints[0].z, 0, 0, 1);
  modelMatrix.rotate(this.vJoints[0].y - 90.0, 0, 1, 0);
  modelMatrix.rotate(this.vJoints[0].x, 1, 0, 0);
  //頭部
  modelMatrix.scale(this.vHead.x, this.vHead.y, this.vHead.z);
  modelMatrix.translate(0.5, 0.0, 0.0);
  this.parts[2].draw(gl, n, modelMatrix);
  
  stackMat[3].copy(modelMatrix);//頭部のモデル行列を保存
  //右目
  modelMatrix.translate(this.vHead.x * 0.21, -this.vHead.y * 0.2, - this.vHead.z * 0.45 );
  modelMatrix.scale(this.vEye.x, this.vEye.y, this.vEye.z);
  this.parts[3].draw(gl, n, modelMatrix);

  modelMatrix.copy(stackMat[3]);//頭部のモデル行列に戻す
  //左目
  modelMatrix.translate(this.vHead.x * 0.21, this.vHead.y * 0.2, - this.vHead.z * 0.45 );
  modelMatrix.scale(this.vEye.x, this.vEye.y, this.vEye.z);
  this.parts[4].draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[3]);//頭部のモデル行列に戻る
　//右耳  
  modelMatrix.translate(this.vHead.x * 0.1, -this.vHead.y * 0.45, this.vHead.z * 0.2 );
  modelMatrix.scale(this.vEar.x, this.vEar.y, this.vEar.z);
  modelMatrix.translate(0.0, 0.0, -0.5);
  this.parts[5].draw(gl, n, modelMatrix);
 
  modelMatrix.copy(stackMat[3]);//頭部のモデル行列に戻る
　 //左耳  
  modelMatrix.translate(this.vHead.x * 0.1, this.vHead.y * 0.45, this.vHead.z * 0.2 );
  modelMatrix.scale(this.vEar.x, this.vEar.y, this.vEar.z);
  modelMatrix.translate(0.0, 0.0, -0.5);
  this.parts[6].draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[3]);//頭部のモデル行列に戻る
　//口鼻全体
  modelMatrix.translate( -0.1 * this.vHead.x, 0.0, -this.vHead.z / 2.0);
  modelMatrix.scale(this.vMouthNose.x, this.vMouthNose.y, this.vMouthNose.z);
  this.parts[7].draw(gl, n, modelMatrix);
  stackMat[4].copy(modelMatrix);//口鼻全体のモデル行列を保存
		
  //鼻
  modelMatrix.translate(this.vMouthNose.x * 0.45, 0.0, -this.vMouthNose.z * 0.85);
  modelMatrix.scale(this.vNose.x, this.vNose.y, this.vNose.z);
  this.parts[8].draw(gl, n, modelMatrix);

  modelMatrix.copy(stackMat[4]);//口鼻全体のモデル行列に戻る
  //口
  modelMatrix.translate(-this.vMouthNose.x * 0.3, 0.0, -this.vMouthNose.z * 0.85);
  modelMatrix.scale(this.vMouth.x, this.vMouth.y, this.vMouth.z);
  this.parts[9].draw(gl, n, modelMatrix);

  //-------脚---------------------------------------
  //前脚
　modelMatrix.copy(stackMat[1]);//前胴体に戻す
  //右側上
  modelMatrix.translate(0.0, -0.4 * this.vTrunk.y, -0.3 * this.vTrunk.z);//前胴体の中心からの股関節の位置
  modelMatrix.rotate(this.vJoints[1].y, 0.0, 1.0, 0.0);//y軸回転
  stackMat[3].copy(modelMatrix);//前右股関節のモデル行列を保存
  modelMatrix.scale(this.vLeg1.x, this.vLeg1.y, this.vLeg1.z );
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[10].draw(gl, n, modelMatrix);
  //右側下  
  modelMatrix.copy(stackMat[3]);//股関節のモデル行列
  modelMatrix.translate(0.0, 0.0, -this.vLeg1.z * 0.9);//下脚の位置へ平行移動
  //膝の回転
  modelMatrix.rotate(this.vJoints[2].y, 0.0, 1.0, 0.0);//y軸回転
  modelMatrix.scale(this.vLeg2.x, this.vLeg2.y, this.vLeg2.z);
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[11].draw(gl, n, modelMatrix);
　modelMatrix.copy(stackMat[1]);//前胴体に戻す
  //左側上
  modelMatrix.translate(0.0, 0.4 * this.vTrunk.y, -0.3 * this.vTrunk.z);
  modelMatrix.rotate(this.vJoints[3].y, 0.0, 1.0, 0.0);//y軸回転
  stackMat[3].copy(modelMatrix);//前右股関節のモデル行列を保存
  modelMatrix.scale(this.vLeg1.x, this.vLeg1.y, this.vLeg1.z );
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[12].draw(gl, n, modelMatrix);
  //左側下  
  modelMatrix.copy(stackMat[3]);
  modelMatrix.translate(0.0, 0.0, -this.vLeg1.z * 0.9);//下脚の位置へ平行移動
  //膝の回転
  modelMatrix.rotate(this.vJoints[4].y, 0.0, 1.0, 0.0);//y軸回転
  modelMatrix.scale(this.vLeg2.x, this.vLeg2.y, this.vLeg2.z);
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[13].draw(gl, n, modelMatrix);

  //後脚
　modelMatrix.copy(stackMat[2]);//後胴体に戻す
  //右側上
  modelMatrix.translate(0.0, -0.4 * this.vTrunk.y, -0.3 * this.vTrunk.z);
  modelMatrix.rotate(this.vJoints[5].y, 0.0, 1.0, 0.0);//股関節y軸回転
  stackMat[3].copy(modelMatrix);//後右股関節のモデル行列を保存
  modelMatrix.scale(this.vLeg1.x, this.vLeg1.y, this.vLeg1.z );
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[14].draw(gl, n, modelMatrix);
  //右側下  
  modelMatrix.copy(stackMat[3]);
  modelMatrix.translate(0.0, 0.0, -this.vLeg1.z * 0.9);//下脚の位置へ平行移動
  modelMatrix.rotate(this.vJoints[6].y, 0.0, 1.0, 0.0);//膝関節y軸回転
  modelMatrix.scale(this.vLeg2.x, this.vLeg2.y, this.vLeg2.z);
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[15].draw(gl, n, modelMatrix);
　modelMatrix.copy(stackMat[2]);//後胴体に戻す
  //左側上
  modelMatrix.translate(0.0, 0.4 * this.vTrunk.y, -0.3 * this.vTrunk.z);
  modelMatrix.rotate(this.vJoints[7].y, 0.0, 1.0, 0.0);//股関節y軸回転
  stackMat[3].copy(modelMatrix);//後右股関節のモデル行列を保存
  modelMatrix.scale(this.vLeg1.x, this.vLeg1.y, this.vLeg1.z );
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[16].draw(gl, n, modelMatrix);
  //左側下  
  modelMatrix.copy(stackMat[3]);//
  modelMatrix.translate(0.0, 0.0, -this.vLeg1.z * 0.9);//下脚の位置へ平行移動
  modelMatrix.rotate(this.vJoints[8].y, 0.0, 1.0, 0.0);//膝関節y軸回転
  modelMatrix.scale(this.vLeg2.x, this.vLeg2.y, this.vLeg2.z);
  modelMatrix.translate(0.0, 0.0, -0.5);//原点の位置へ下げる
  this.parts[17].draw(gl, n, modelMatrix);
  //尾
　modelMatrix.copy(stackMat[2]);//後胴体に戻す
  modelMatrix.translate(-0.3 * this.vTrunk.x, 0.0, 0.3 * this.vTrunk.z);
  modelMatrix.rotate(this.vJoints[9].y, 0.0, 1.0, 0.0);//y軸回転
  //stackMat[3].copy(modelMatrix);//後右股関節のモデル行列を保存
  modelMatrix.scale(this.vTail.x, this.vTail.y, this.vTail.z );
  modelMatrix.translate(-0.5, 0.0, 0.0);//原点の位置へ下げる
  this.parts[18].draw(gl, n, modelMatrix);

}

//----------------------------------------------------------------------------
//  animation
//----------------------------------------------------------------------------
//keyframeを作成するメンバ関数において最初にcallする
Dog.prototype.initKeyAnimation = function()
{
  //最初のキーフレーム値を現在の値にセット

  for(var i = 0; i < this.numKeyFrame; i++)
  {
    this.k_vPos[i].copy(this.vPos);//new Vector3();
    this.k_vEuler[i].copy(this.vEuler);
    for(var j = 0; j < this.numJoints; j++) this.k_vJoints[i * this.numJoints + j].copy(this.vJoints[j]);
  }
}
//----------------------------------------------------------------------------
//ﾌﾚｰﾑﾃﾞｰﾀ作成
//keyframeを作成するメンバ関数で最後にcall
 Dog.prototype.makeFrameData = function ()
{
  var i, j, k, numHokan, ss;
  for(k = 1; k < this.numKeyFrame; k++)
  {
    numHokan = Math.floor(this.actTime[k] / this.unitTime);//補間点数

    if(numHokan == 0) continue;
    if(this.numFrame + numHokan > MAXFRAME) 
    {
      alert("フレーム数が制限を越えるおそれがあります ");
      return;
    }
    
    var vpos = new Vector3();
    vpos.copy( sub(this.k_vPos[k], this.k_vPos[k-1]) );
    var vang = new Vector3();
    vang.copy( sub(this.k_vEuler[k], this.k_vEuler[k-1]) );
    for(i = 0; i <= numHokan; i++)
    {
      ss = i / numHokan;
      this.f_vPos[this.numFrame + i].x = this.k_vPos[k-1].x + vpos.x * ss;
      this.f_vPos[this.numFrame + i].y = this.k_vPos[k-1].y + vpos.y * ss;
      this.f_vPos[this.numFrame + i].z = this.k_vPos[k-1].z + vpos.z * ss;

      this.f_vEuler[this.numFrame + i].x = this.k_vEuler[k-1].x + vang.x * ss;;
      this.f_vEuler[this.numFrame + i].y = this.k_vEuler[k-1].y + vang.y * ss;;
      this.f_vEuler[this.numFrame + i].z = this.k_vEuler[k-1].z + vang.z * ss;;
      
      for(j = 0; j < this.numJoints; j++)
      {//補間データを作成(線形補間)
        this.f_vJoints[(this.numFrame + i) * this.numJoints + j].x = this.k_vJoints[(k-1) * this.numJoints + j].x 
          + (this.k_vJoints[k*this.numJoints + j].x - this.k_vJoints[(k-1)*this.numJoints + j].x) * ss;
        this.f_vJoints[(this.numFrame + i) * this.numJoints + j].y = this.k_vJoints[(k-1) * this.numJoints + j].y 
          + (this.k_vJoints[k*this.numJoints + j].y - this.k_vJoints[(k-1)*this.numJoints + j].y) * ss;
        this.f_vJoints[(this.numFrame + i) * this.numJoints + j].z = this.k_vJoints[(k-1) * this.numJoints + j].z 
          + (this.k_vJoints[k*this.numJoints + j].z - this.k_vJoints[(k-1)*this.numJoints + j].z) * ss;
      }
    }
    this.numFrame += numHokan;
  }

  this.vPos.copy(this.f_vPos[this.numFrame]);
  this.vEuler.copy(this.f_vEuler[this.numFrame]);
  for(i = 0; i < this.numJoints; i++) this.vJoints[i].copy(this.f_vJoints[this.numFrame*this.numJoints + i]);
}
//----------------------------------------------------------
//与えられた距離歩く
Dog.prototype.walk = function(dist, step, time)
{                    //距離, 歩幅 , 所要時間(s)    　　　　　　
  var i, numStep, numStep2, rest;

  numStep = Math.floor(dist / step);
  //右足,左足2歩を単位とした歩数
  numStep2 = Math.floor(numStep / 2);

  var time1 = time * step / dist;
  var flag = "RIGHT";//左右フラグ
  while(dist > 0)
  {
    if(dist > 2 * step)
    {
      this.walkRight(step, time1);//前右，後左
      this.walkLeft(step, time1); //前左，後右
      dist -= 2 * step;
    }
    else if(dist > step)
    {
      this.walkRight(step, time1);//前右，後左
      flag = "LEFT";
      dist -= step;//alert("bbb dist=" + dist);
    }
    else if(dist > 0)
    {
      if(flag == "RIGHT") this.walkRight(dist, time1 * dist / step);//前右，後左
      else                this.walkLeft(dist, time1 * dist / step); //前左，後右
      dist -= step;
    }
  }
}       
//---------------------------------------------------------------------
Dog.prototype.walkRight = function(step, time)
{
  var step2 = step / 2.0;//半歩
  var pp = Math.PI / 180.0;
  //股関節角度
  var stepA = 180.0 * Math.asin(step2 / this.legLen) / Math.PI;
  var cc = step2 * Math.cos(pp * this.vEuler.z) ;//半歩のx成分(基本姿勢ではx方向が前）
  var ss = step2 * Math.sin(pp * this.vEuler.z) ;//y成分
  
  this.numKeyFrame = 3;
  this.initKeyAnimation();
  //action1(右前脚一歩前へ)
  this.k_vJoints[1*this.numJoints + 1].y = -stepA;//前右
  this.k_vJoints[1*this.numJoints + 3].y = stepA; //前左
  this.k_vJoints[1*this.numJoints + 5].y = stepA;//後右
  this.k_vJoints[1*this.numJoints + 7].y = -stepA; //後左
  this.k_vPos[1].x = this.k_vPos[0].x + cc;
  this.k_vPos[1].y = this.k_vPos[0].y + ss;
  this.actTime[1] = time / 2.0;

  //action2(基本姿勢に戻る)
  this.k_vJoints[2*this.numJoints + 1].y = 0.0;//前右
  this.k_vJoints[2*this.numJoints + 3].y = 0.0;//前左
  this.k_vJoints[2*this.numJoints + 5].y = 0.0;//後右
  this.k_vJoints[2*this.numJoints + 7].y = 0.0;//後左
  this.k_vPos[2].x = this.k_vPos[1].x + cc;
  this.k_vPos[2].y = this.k_vPos[1].y + ss;
  this.actTime[2] = time / 2.0;

  this.makeFrameData();
}
//---------------------------------------------------------------------
Dog.prototype.walkLeft = function(step, time)
{
  var step2 = step / 2.0;
  var pp = Math.PI / 180.0;
  //股関節角度
  var stepA = 180.0 * Math.asin(step2 / this.legLen) / Math.PI;
  var cc = step2 * Math.cos(pp * this.vEuler.z);//半歩のx成分
  var ss = step2 * Math.sin(pp * this.vEuler.z);//y成分

  this.numKeyFrame = 3;
  this.initKeyAnimation();
  //action1(右前脚一歩前へ)
  this.k_vJoints[1*this.numJoints + 1].y = stepA; //前右
  this.k_vJoints[1*this.numJoints + 3].y = -stepA;//前左
  this.k_vJoints[1*this.numJoints + 5].y = -stepA;//後右
  this.k_vJoints[1*this.numJoints + 7].y = stepA; //後左
  this.k_vPos[1].x = this.k_vPos[0].x + cc;
  this.k_vPos[1].y = this.k_vPos[0].y + ss;
  this.actTime[1] = time / 2.0;

  //action2(基本姿勢に戻る)
  this.k_vJoints[2*this.numJoints + 1].y = 0.0;//前右
  this.k_vJoints[2*this.numJoints + 3].y = 0.0;//前左
  this.k_vJoints[2*this.numJoints + 5].y = 0.0;//後右
  this.k_vJoints[2*this.numJoints + 7].y = 0.0;//後左
  this.k_vPos[2].x = this.k_vPos[1].x + cc;
  this.k_vPos[2].y = this.k_vPos[1].y + ss;
  this.actTime[2] = time / 2.0;

  this.makeFrameData();
}

//--------------------------------------------------------------------------
//正面方向の回転(angle>0で上から見て左回転)
Dog.prototype.turn = function(angle, time)
{
  this.numKeyFrame = 2;
  this.initKeyAnimation();
  
  this.k_vEuler[1].copy(this.k_vEuler[0]);
  this.k_vEuler[1].z += angle;
  this.actTime[1] = time;
  this.makeFrameData();
}


//後脚で立ち上がる
Dog.prototype.stand = function(time)
{
  this.numKeyFrame = 2;
  this.initKeyAnimation();

  this.k_vJoints[this.numJoints + 5].y = 90.0;//後右
  this.k_vJoints[this.numJoints + 7].y = 90.0;//後左
  this.k_vEuler[1].y = -90.0;
  this.k_vJoints[this.numJoints + 0].y = 90.0;
  this.actTime[1] = time ;
  this.makeFrameData();
}

//基本姿勢に戻る
Dog.prototype.initPose = function(time)
{
  var j;
	
  this.numKeyFrame = 2;
  this.initKeyAnimation();

  for(j = 0; j < this.numJoints; j++) this.k_vJoints[this.numJoints + j] = new Vector3();
  this.k_vEuler[1].y = 0.0;
  this.k_vEuler[1].x = 0.0;
  this.actTime[1] = time;
  this.makeFrameData();
}

Dog.prototype.wait = function(time)
{
  this.numKeyFrame = 2;
  this.initKeyAnimation();
  this.actTime[1] = time;
  this.makeFrameData();
}

Dog.prototype.swingTail = function(n, time)
{
  var i;
	
  for(i = 0; i < n; i++) 
  {
    this.upTail(time/(2.0*n));
    this.downTail(time/(2.0*n));
  }
}

Dog.prototype.upTail = function(time)
{
  this.numKeyFrame = 2;
  this.initKeyAnimation();
  this.k_vJoints[this.numJoints + 9].y = this.k_vJoints[9].y + 30.0;
  this.actTime[1] = time;
  this.makeFrameData();
}

Dog.prototype.downTail = function(time)
{
	this.numKeyFrame = 2;
	this.initKeyAnimation();
	this.k_vJoints[this.numJoints + 9].y = this.k_vJoints[9].y -30.0;
	this.actTime[1] = time;
	this.makeFrameData();
}

