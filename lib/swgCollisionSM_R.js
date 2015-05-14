/*--------------------------------------------------------------
     collisionSM_R.js
     2次元バス質点モデルと剛体球の衝突
----------------------------------------------------------------*/

function collisionSMwithR(sm, dt)
{
  var i, j, d;
console.log(" numPoint = " + sm.numPoint)
  
  for(k = 0; k < sm.numPoint; k++)
  {   
    d = distance(sm.point[k].vPos,  sm.rigid2.vPos);
	if( d > sm.radius + sm.rigid2.vSize.x / 2.0) continue;
	collisionSM_Rigid(sm, k, dt);
  }
}
//--------------------------------------------------------------------------
function collisionSM_Rigid(sm, k, dt)
{
	var rikiseki;
	var vn1, vn2;//法線成分の大きさ
	var muc, B, m1, m2;
	var vVelocityP1, vVelocityP2;//合成速度
	var vNormal;//注目剛体(質点)から見た衝突面の法線方向
	var vTangential;//接線方向
	var vDir, vA1, vA2, vRg1, vRg2;

    //var k = i + j * (sm.numRow + 1);
	sm.point[k].vForce =new Vector3();
	sm.point[k].vTorque = new Vector3();
	sm.rigid2.vForce = new Vector3();
	sm.rigid2.vTorque = new Vector3();

	vNormal = direction(sm.point[k].vPos, sm.rigid2.vPos);
//console.log(" nx = " + vNormal.x + " ny = " + vNormal.y + " nz = " + vNormal.z);

	//重心から衝突点までのベクトル
	sm.point[k].vGravityToPoint = mul(sm.radius , vNormal);
	sm.rigid2.vGravityToPoint = mul(sm.rigid2.vSize.x/2.0 , vNormal);

	sm.rigid2.vGravityToPoint.reverse();
	var depth = (sm.radius + sm.rigid2.vSize.x / 2.0) - distance(sm.point[k].vPos, sm.rigid2.vPos);

	if(depth < 0.0) return;
	vRg1 = sm.point[k].vGravityToPoint;
	vRg2 = sm.rigid2.vGravityToPoint;
	m1 = sm.mass;//質点の質量
	m2 = sm.rigid2.mass;
//console.log("PPP x = " + sm.point[k].vOmega.x + " y = " + sm.point[k].vOmega.y + " z = " + sm.point[k].vOmega.z);

	vVelocityP1 = add(sm.point[k].vVel, cross(sm.point[k].vOmega, vRg1));
	vn1 = dot(vVelocityP1, vNormal);
	vVelocityP2 = add(sm.rigid2.vVel, cross(sm.rigid2.vOmega, vRg2));
	vn2 = dot(vVelocityP2, vNormal);

	//衝突応答
	vTangential = cross( vNormal, cross(sub(vVelocityP1, vVelocityP2), vNormal));
	vTangential.norm();
	//力積
	rikiseki = - (restitution + 1.0) * (vn1 - vn2) / (1.0/m1 + 1.0/m2
		  + dot(vNormal , cross(mulMV(sm.point[k].mInertiaInverse, cross(vRg1, vNormal)), vRg1))
		  + dot(vNormal , cross(mulMV(sm.rigid2.mInertiaInverse, cross(vRg2, vNormal)), vRg2)));
	//力の総和
	var vFF = mul(vNormal , rikiseki / dt);
	sm.point[k].vForce.add(vFF);
	sm.rigid2.vForce.sub(vFF);
	//力のモーメント（トルク）の総和
	vFF = mul(cross(vRg1, vNormal) , rikiseki / dt);
	sm.point[k].vTorque.add(vFF); 
	sm.rigid2.vTorque.sub(vFF);

	//摩擦を考慮
	vA1 = cross(mulMV(sm.point[k].mInertiaInverse, cross(vRg1, vTangential)) , vRg1);
	vA2 = cross(mulMV(sm.rigid2.mInertiaInverse, cross(vRg2, vTangential)) , vRg2);
	B = - dot(vTangential, sub(vVelocityP1, vVelocityP2)) / (1/m1+1/m2+ dot(vTangential,add(vA1, vA2)));
	muc = Math.abs(B / rikiseki);
	if(muK >= muc)
	{
		sm.point[k].vForce.add( mul(vTangential, B / dt) );
		sm.point[k].vTorque.add( mul(cross(vRg1, vTangential) , B / dt ));
		sm.rigid2.vForce.sub( mul(vTangential,  B / dt) );
		sm.rigid2.vTorque.sub( mul(cross(vRg2, vTangential) , B / dt) );
	}
	else
	{
		sm.point[k].vForce.add( mul(muK * rikiseki / dt, vTangential) );
		sm.point[k].vTorque.add( mul(cross(vRg1, vTangential) , muK * rikiseki / dt) );
		sm.rigid2.vForce.sub( mul(muK * rikiseki / dt , vTangential) );
		sm.rigid2.vTorque.sub( mul(cross(vRg2, vTangential) , muK * rikiseki / dt) );
	}
	//衝突判定時にめり込んだ分引き離す
	vFF = mul(depth/2.0, vNormal);
	sm.point[k].vPos.sub( vFF );				
	if(sm.rigid2.state == "FREE") sm.rigid2.vPos.add( vFF );

	//位置回転角度の更新
	// i番目の剛体
	sm.point[k].vAccel = div(sm.point[k].vForce , m1) ;    //加速度
	sm.point[k].vVel.add( mul(sm.point[k].vAccel , dt) );//速度
	sm.point[k].vAlpha = mulMV(sm.point[k].mInertiaInverse , sm.point[k].vTorque);//角加速度の更新
	sm.point[k].vOmega.add( mul(sm.point[k].vAlpha , dt) );          //角速度

	// 剛体
	if(sm.rigid2.state == "FREE")
	{
	  sm.rigid2.vAccel = div(sm.rigid2.vForce , m2);
	  sm.rigid2.vVel.add( mul(sm.rigid2.vAccel , dt) );
	  sm.rigid2.vAlpha = mulMV(sm.rigid2.mInertiaInverse , sm.rigid2.vTorque);
	  sm.rigid2.vOmega.add( mul(sm.rigid2.vAlpha , dt) );
	}
}
