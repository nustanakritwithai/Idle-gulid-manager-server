# Guild Arena — Server Manager Dashboard

Dashboard ภาษาไทยสำหรับ Guild Arena v1.2 ใช้ HTML, CSS และ JavaScript ES modules โดยไม่มีขั้นตอน build หรือ dependency ภายนอก เผยแพร่เป็นเว็บสาธารณะผ่าน GitHub Pages ส่วนข้อมูลและคำสั่งจัดการทุกอย่างเรียก Backend บน VPS ซึ่งต้องยืนยันสิทธิ์แอดมิน

## เปิดใช้งาน

1. กำหนด URL สาธารณะของ API ใน `config.js` โดยไม่ใส่ `/api/v1` ต่อท้าย หรือแก้ช่องปลายทาง API บนหน้าล็อกอิน
2. ให้ Backend อนุญาต CORS origin ของ GitHub Pages: `https://nustanakritwithai.github.io` รวม header `Authorization`, `Content-Type`, `Idempotency-Key` และ method ที่ใช้งาน
3. เปิด GitHub Pages แล้วเข้าสู่ระบบด้วยบัญชีผู้ดูแลที่สร้างบน Backend ไม่มีรหัสผ่านหรือคีย์เริ่มต้นใน repo นี้
4. สร้างสองทีมจากหน้า “ทีมจำลอง” แล้วเลือกทั้งสองทีมในหน้า “เริ่มการต่อสู้”

ปลายทางที่ตั้งไว้คือ `https://guild-arena.157.85.96.139.sslip.io` ต้องให้ VPS ตั้ง HTTPS และ API พร้อมก่อนจึงจะล็อกอินได้ URL API อนุญาต HTTPS หรือ HTTP เฉพาะ localhost, 127.0.0.1 และ ::1 สำหรับทดสอบ

สำหรับทดสอบหน้าเว็บในเครื่อง ใช้ static HTTP server เช่น `python -m http.server 8085 --bind 127.0.0.1` แล้วเปิด `http://127.0.0.1:8085` ต้องเพิ่ม origin นี้ใน CORS ของ Backend ทดสอบด้วย การเปิด `index.html` ผ่าน file:// ใช้ ES modules ไม่ได้

## หน้าที่มี

- ภาพรวม: สถานะ API, worker, คิว, จำนวนแมตช์ แมตช์ล่าสุด พื้นที่ดิสก์/ฐานข้อมูล/WAL/Backup/ฐานทดสอบ และการแจ้งเตือนจาก API จริง
- ทีมจำลอง: สร้างและแก้ไข JSON ทีม 3 ตัวละคร พร้อม revision และการตรวจข้อมูลเบื้องต้น ตัวอย่างเติมแบบฟอร์มเท่านั้น ต้องกดบันทึกก่อนสร้างข้อมูลจริง
- เริ่มการต่อสู้: เลือกสองทีม ล็อก revision, seed uint32 และ rulesVersion `prototype-v1`
- ประวัติแมตช์: กรองสถานะและอ่านผล รายละเอียดทีม seed และ hash
- Snapshot และรีเพลย์: แสดงลำดับเหตุการณ์ พร้อมก่อนหน้า/ถัดไป/เล่น/เลื่อนตำแหน่ง ดาวน์โหลด JSON และให้เซิร์ฟเวอร์ตรวจการจำลองซ้ำ
- ชุดทดลองและเปรียบเทียบ: สั่ง 1–100 แมตช์ด้วย seed ต่อเนื่อง ล็อก snapshot/revision ดูความคืบหน้า อัตราชนะ รอบเฉลี่ย เปรียบเทียบสองชุด ทดลองซ้ำด้วย snapshot เดิม และส่งออก CSV ผ่าน Bearer token
- บัญชีและความปลอดภัย: เปลี่ยนรหัสผ่านพร้อมยืนยันช่องรหัสใหม่ ยกเลิกทุกเซสชัน และดู Audit ทีละ 50 รายการผ่าน opaque cursor
- คิวและข้อผิดพลาด: แสดงงานทั้งหมดที่ API ส่งมา ลองใหม่เฉพาะงานสถานะ failed
- สำรองและกู้คืน: สร้าง Backup ด้วยตนเอง ดูประวัติทดสอบกู้คืน โดยต้องพิมพ์ `RESTORE TEST` ยืนยันก่อนส่งคำขอ

รุ่น 1.1 แสดงนโยบาย Backup จาก API: ตารางที่อนุมัติคือทุกวัน 03:00 น. เขตเวลา Asia/Bangkok เก็บใน VPS 7 ชุด และ Google Drive 30 ชุด การลบตามนโยบายจำกัดเฉพาะ Backup ที่ระบบนี้บันทึกไว้ Dashboard แสดงสถานะจริงของการตั้งค่าและสำเนาที่ผ่านการตรวจสอบ การเปิดตารางไม่ยืนยันว่าสำเนานอก VPS พร้อมใช้งาน ต้องดู configured, verifiedAt และ lastError ประกอบ และ Dashboard ไม่มีคำสั่งกู้ทับฐานใช้งาน

## การยืนยันตัวตนและคำสั่งซ้ำ

- Bearer token อยู่เฉพาะในหน่วยความจำหน้าเว็บ ไม่มีการเก็บใน localStorage, sessionStorage, cookie หรือ URL
- localStorage เก็บเพียง URL API สาธารณะ ช่องรหัสผ่านถูกล้างหลังส่งคำขอล็อกอิน
- รีโหลดหรือปิดหน้าแล้วต้องเข้าสู่ระบบใหม่ เมื่อ API ส่ง 401 จะปิดเซสชันและกลับหน้าล็อกอิน
- Dashboard อาจถูกเปิดได้โดยสาธารณะ แต่ Backend ต้องตรวจสิทธิ์ทุก endpoint เสมอ CORS เป็นข้อจำกัดของ browser ไม่ใช่ระบบยืนยันตัวตน
- คำสั่งต่อสู้ใช้ `Idempotency-Key` ที่สร้างใน browser และเก็บในหน่วยความจำ ข้อมูลเดิมใช้คีย์เดิม แม้คำขอหมดเวลาหรือส่งสำเร็จแล้ว เมื่อข้อมูลเปลี่ยนหรือกด “เริ่มคำสั่งใหม่” จะใช้คีย์ใหม่
- หลังรีโหลด คีย์เก่าจะไม่อยู่ในหน่วยความจำ ให้ตรวจประวัติก่อนส่งคำสั่งใหม่หากไม่ทราบผลของคำสั่งก่อนหน้า
- ข้อมูลจาก API ใช้ textContent และ DOM nodes ไม่มีการแทรกข้อมูลผู้ใช้ด้วย HTML
- โหลดสถานะใหม่ทุก 15 วินาทีเฉพาะตอนล็อกอินและหน้าเว็บมองเห็น ไม่มีการ refresh ซ้อนกัน

## สัญญา API

ทุก endpoint ใช้ prefix `/api/v1` และทุกคำขอยกเว้น login ส่ง `Authorization: Bearer <token>`

| คำขอ | ข้อมูลหลัก |
| --- | --- |
| POST `/auth/login` | `{username,password}` → `{token,expiresAt}` |
| POST `/auth/logout` | ปิดเซสชันบนเซิร์ฟเวอร์ |
| GET `/system/status` | `{api,worker,queue,matches,database,backup,storage,alerts}` |
| GET `/teams` | `{teams:[{id,revision,schemaVersion,name,characters,createdAt,updatedAt}]}` |
| POST `/teams` | ข้อมูลทีม → ทีมที่บันทึก |
| PUT `/teams/:id` | ข้อมูลทีมพร้อม `revision` ปัจจุบัน |
| POST `/matches` | `{teamAId,teamBId,teamARevision,teamBRevision,seed,rulesVersion}` + Idempotency-Key → `{matchId,jobId,status}` |
| GET `/matches` | `{matches:[{id,status,createdAt,completedAt,teamAName,teamBName,winner,error}]}` |
| GET `/matches/:id` | `{id,status,input,inputHash,events,result,outputHash,createdAt,error}` |
| GET `/matches/:id/snapshot` | `{snapshotSchemaVersion,matchId,createdAt,input,inputHash,events,result,outputHash}` |
| POST `/matches/:id/replay-checks` | `{id,matchId,status,expectedHash,actualHash,error,createdAt}` |
| GET `/jobs` | `{jobs:[{id,matchId,status,attempts,retries,error,createdAt,updatedAt}]}` |
| POST `/jobs/:id/retry` | นำงานที่ล้มเหลวกลับเข้าคิว |
| GET `/backups` | `{backups:[{id,status,sha256,bytes,createdAt,completedAt,error}]}` |
| POST `/backups` | สร้างข้อมูลสำรอง |
| POST `/backups/:id/restore-tests` | `{confirmation:"RESTORE TEST"}` → ผลการทดสอบกู้คืน |
| GET `/restore-tests` | `{restoreTests:[{id,backupId,status,integrity,checkedMatches,createdAt,completedAt,error}]}` |

ข้อผิดพลาดรองรับ `{error:{code,message},requestId}` ข้อผิดพลาดเครือข่าย/HTTPS/CORS แจ้งบนหน้าเว็บ ไม่มีสถานะหรือผลการต่อสู้จำลองไว้แทนข้อมูลจริง

รูปแบบทีม: `schemaVersion: 1`, `name`, `characters` จำนวน 3 รายการ แต่ละตัวมี `id`, `name`, `position` 1–3 ไม่ซ้ำ, `stats: {hp,attack,defense,speed}`, `equipment: {weaponAttack,armorDefense,bonusHp}` และ `skills: [{id}]` โดย id สกิลรองรับ `strike`, `power-strike`, `heal` ข้อจำกัดทั้งหมดตรวจซ้ำโดย Backend

## ขอบเขตการรีเพลย์

หน้ารีเพลย์เล่นบันทึกเหตุการณ์ (transcript) ที่ Backend ส่งมา ไม่ใช่ภาพเคลื่อนไหวเกม การตรวจความเหมือนของผลทำโดย Backend ด้วย snapshot, seed, engine และกติกาเวอร์ชันเดิม กติกา prototype-v1 ยังไม่ผ่านการทดสอบเทียบกับ Idle Guild Manager

## ตรวจเบื้องต้น

```text
node --check app.js
node --check config.js
```

ตรวจใน browser เพิ่ม: ล็อกอินผิด/ถูก, สร้างและแก้ทีม, ส่งแมตช์ซ้ำด้วยข้อมูลเดิม, เปิดผลและเล่นเหตุการณ์, ตรวจผลการจำลองซ้ำ, ลองงานล้มเหลว, Backup/ทดสอบกู้คืน, ออกจากระบบ และขนาดหน้าจอมือถือ

## เพิ่มในรุ่น 1.1

| คำขอ | ข้อมูลหลัก |
| --- | --- |
| POST `/auth/password` | `{currentPassword,newPassword}` → `{ok:true,reauthenticate:true}` |
| POST `/auth/revoke-sessions` | `{currentPassword}` → ยกเลิกทุกเซสชันรวมเซสชันปัจจุบัน |
| GET `/audit?limit=50&before=<cursor>` | `{entries:[{id,actor,actorName?,action,target,metadata,createdAt}],nextCursor}` |
| POST `/batches` | `{name,teamAId,teamBId,teamARevision,teamBRevision,rulesVersion,startSeed,count}` + Idempotency-Key → `{id,status,reused}` |
| GET `/batches` | `{batches:[...]}` |
| GET `/batches/:id` | `{id,name,status,createdAt,input,summary,matches}` |
| POST `/batches/:id/reruns` | Idempotency-Key → ชุดใหม่จาก snapshot/seed เดิม ไม่อ่าน revision ล่าสุด |
| GET `/batches/:id/export.csv` | ดาวน์โหลด CSV ผ่าน fetch พร้อม Bearer token แล้วบันทึก Blob ไม่มีลิงก์ดาวน์โหลดแบบไม่ตรวจสิทธิ์ |
| GET `/backup-policy` | `{schedule,retention,offsite,status}` |
| GET `/backup-copies` | `{copies:[{backupId,provider,providerFileId,status,verifiedAt,sha256,...}]}` |

รหัสผ่านใหม่ต้องยาว 12–1024 ตัวอักษร ต่างจากรหัสเดิม และตรงกับช่องยืนยัน หน้าเว็บล้างช่องรหัสผ่านทุกครั้งหลังส่งฟอร์ม เมื่อเปลี่ยนสำเร็จหรือยกเลิกทุกเซสชันจะล้างโทเคนและกลับหน้าล็อกอิน Backend จำกัดคำสั่งละเอียดอ่อนสองเส้นทางนี้รวม 5 ครั้งต่อ 15 นาทีต่อผู้ดูแล

ชุดทดลองใช้ count จำนวนเต็ม 1–100 และ startSeed จำนวนเต็ม uint32 ในรูปสตริง โดย seed สุดท้ายต้องไม่เกิน 4294967295 การส่งข้อมูลเดิมหลังเครือข่ายขัดข้องหรือส่งซ้ำใช้ Idempotency-Key เดิม กด “เริ่มคำสั่งชุดใหม่” เมื่อต้องการสร้างชุดใหม่จากข้อมูลเดิม คีย์อยู่ในหน่วยความจำเท่านั้น การรีโหลดจึงต้องตรวจประวัติก่อนส่งใหม่

winRateA และ winRateB เป็นเปอร์เซ็นต์ 0–100 คำนวณจากแมตช์ succeeded และเป็น null เมื่อยังไม่มีผลสำเร็จ averageRounds ใช้ผลสำเร็จเช่นกัน Dashboard แสดง succeeded/total และป้ายผลเบื้องต้นหากยังไม่ครบหรือมีแมตช์ล้มเหลว การเปรียบเทียบแสดงชื่อทีม revision กติกา seed และจำนวนตัวอย่างเพื่อไม่ให้ตีความสถิติข้ามเงื่อนไข

ตารางเหตุการณ์ รายการแมตช์ในชุด Audit และสำเนา Backup จำกัดความสูงและเลื่อนภายในกรอบ พร้อมหัวตารางตรึง รองรับมือถือโดยไม่ขยายความกว้างทั้งหน้า

การสำรองตามเวลาใน VPS ทำงานอิสระจาก Codex app ส่วนการส่งสำเนาไป Google Drive ใช้ Codex app ที่ต้องเปิดอยู่และเชื่อม Drive ได้ เมื่อแอปปิดหรือเชื่อมต่อไม่ได้ สำเนานอก VPS อาจค้างส่ง ให้ตรวจสถานะและ verifiedAt ของสำเนาจริง ชื่อชุดทดลองจำกัด 80 ตัวอักษรตาม Backend และ stats.speed อนุญาต 0 ตามกติกาต้นแบบ

## Manager 1.2 — เตรียมรอรับตัวรันเกมจริง

หน้า “เชื่อมตัวรัน” แสดงทะเบียนตัวรัน สถานะรับมอบ และรายการที่รอทีมเกมจาก API ตัวรันเกมจริงยังไม่พร้อม และสัญญาข้อมูลยังเป็นฉบับร่างที่ทีมเกมต้องรับรอง การมี Manager หรือผ่าน Fixture ไม่ใช่หลักฐานว่า PvP พร้อมใช้งาน

ตัวในระบบชื่อ manager-fixture เป็นตัวทดสอบช่องทางรับส่งข้อมูลเท่านั้น ไม่มีตรรกะต่อสู้ เริ่มต้นปิดไว้ การเปิดหรือปิดต้องยืนยันก่อนส่งคำขอ พร้อม revision และ confirmation เพื่อให้ Backend ตรวจและบันทึก Audit ตัวรันเกมที่ยังไม่รับมอบไม่มีปุ่มเปิดใช้

โหลดคำขอตัวอย่างจาก GET /runner-fixture ก่อนแก้ไขหรือส่ง JSON หน้าเว็บตรวจว่าเป็น object และมีตัวละคร 1–3 ตัวต่อฝ่าย ส่วนข้อมูลเกมในแต่ละตัวละครและ arena ส่งตามต้นฉบับโดยไม่ตีความสเตตัส สกิล อุปกรณ์ หรือแผนที่ Backend เป็นผู้ตรวจสัญญาขั้นสุดท้าย ไม่มี map editor หรือสกิลเกมที่สร้างเพิ่มใน Dashboard

| คำขอ | ข้อมูลหลัก |
| --- | --- |
| GET `/runners` | `{runners,readiness}` โดย readiness แยก realRunnerReady และ testRunnerEnabled |
| GET `/runner-fixture` | `{request}` ซึ่งใช้เป็น body ของ runner-matches ได้โดยตรง |
| POST `/runners/:id/enabled` | `{enabled,revision,confirmation}` confirmation เป็น ENABLE TEST RUNNER หรือ DISABLE RUNNER |
| POST `/runner-matches` | คำขอ Fixture + Idempotency-Key → `{matchId,jobId,status,reused}` |
| GET `/matches/:id` | รายละเอียดชนิด runner พร้อม input/events/result/durationMs |
| GET `/matches/:id/snapshot` | snapshotSchemaVersion 2, kind runner, metadata ของตัวรันและ versions ที่ล็อกไว้ |
| POST `/matches/:id/replay-checks` | Backend ตรวจซ้ำด้วยชนิดและเวอร์ชันตัวรันเดิม |

คำสั่งซ้ำใช้ Idempotency-Key ในหน่วยความจำ โดยเทียบ JSON ที่เรียง object keys แล้ว การสลับลำดับ key หรือปรับ whitespace จึงไม่สร้างคำสั่งใหม่ กด “เริ่มคำสั่งทดสอบใหม่” เมื่อต้องการส่งเป็นงานใหม่อย่างตั้งใจ

ประวัติและ Snapshot แยก kind runner ออกจาก prototype-v1 งาน Fixture มีป้าย TEST ONLY และแสดง durationMs ตามผลตัวรัน เหตุการณ์ใหม่แสดงชนิด เวลา และ JSON ตามต้นฉบับ ไม่ใช้ตัวแสดงผลโจมตี/สกิล/HP ของ prototype ไปตีความ เหตุการณ์และผล Fixture ไม่ใช่ข้อมูลสำหรับสรุปสมดุลเกม
