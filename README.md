# Guild Arena — Server Manager Dashboard

Dashboard ภาษาไทยสำหรับ Guild Arena v1.4 ใช้ HTML, CSS และ JavaScript ES modules โดยไม่มีขั้นตอน build หรือ dependency ภายนอก เผยแพร่เป็นเว็บสาธารณะผ่าน GitHub Pages ข้อมูลและคำสั่งจัดการเรียก Backend บน VPS ซึ่งตรวจสิทธิ์แอดมิน มีหน้าบัญชีผู้เล่นแยกที่ player.html และใช้สิทธิ์ผู้เล่นเฉพาะของตน

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

ตารางคำสั่งแอดมินด้านล่างใช้ prefix `/api/v1` และทุกคำขอยกเว้น login ส่ง `Authorization: Bearer <token>` ส่วนเส้นทางบัญชีผู้เล่นและคำขอสาธารณะระบุแยกในหัวข้อ Manager 1.3

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
node --check player.js
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

## Manager 1.3 — บัญชีผู้เล่น

เปิด player.html เพื่อสมัครหรือเข้าสู่ระบบผู้เล่น บัญชีผู้เล่นแยกสิทธิ์จากแอดมินโดย Backend หน้านี้เป็นส่วนบัญชีสำหรับให้ทีมเกมเชื่อมต่อ ยังไม่มีการต่อสู้ PvP หรือข้อมูลตัวละครเกมจริง ผู้เล่นสมัครสำเร็จแล้วเข้าสู่ระบบทันที ดูบัญชี เปลี่ยนรหัสผ่าน ออกจากระบบปัจจุบัน หรือยกเลิกทุกเซสชันด้วยรหัสผ่านปัจจุบันได้

ชื่อผู้ใช้ยาว 3–32 ตัว ใช้ A–Z, a–z, 0–9, _ . - โดยถือพิมพ์ใหญ่/เล็กเป็นบัญชีเดียวกันและเก็บแบบ lowercase ชื่อที่แสดงไม่บังคับ ถ้าระบุให้ยาว 1–48 Unicode codepoints รหัสผ่านใหม่ยาว 15–128 Unicode codepoints ตามนโยบายที่ API ส่งมา ช่องยืนยันต้องตรงกัน หน้าเว็บล้างช่องรหัสผ่านหลังส่งฟอร์มเสมอ

player.js เก็บ token ในหน่วยความจำของ module เท่านั้น ไม่เก็บ token หรือรหัสผ่านใน localStorage/sessionStorage/cookie/URL และไม่บันทึก URL API เมื่อรีโหลดหรือออกจากหน้า ต้องเข้าสู่ระบบใหม่ การเปลี่ยนรหัสผ่านและยกเลิกทุกเซสชันทำให้กลับหน้าล็อกอิน การเข้าสู่ระบบใช้สิทธิ์ผู้เล่นเท่านั้น ไม่สามารถเรียก API แอดมิน

หน้าแอดมิน #players แสดงรายชื่อทีละ 50 บัญชี ค้นหาผ่าน API และใช้ opaque cursor โหลดก่อนหน้าได้ เปิด/ปิดรับสมัคร ระงับ/คืนบัญชี และยกเลิกเซสชันต้องยืนยัน พร้อมส่ง revision และ confirmation Backend เป็นผู้ตรวจสิทธิ์ ความขัดแย้งของ revision และบันทึก Audit การปิดรับสมัครไม่ปิดการล็อกอินบัญชีเดิม

| คำขอ | ข้อมูลหลัก |
| --- | --- |
| GET /player/auth/config | public: registrationEnabled, revision, maxPlayers, sessionLifetimeSeconds, passwordMinLength, passwordMaxLength |
| POST /player/auth/register | public: {username,password,displayName?} → {token,expiresAt,player} |
| POST /player/auth/login | public: {username,password} → {token,expiresAt,player} |
| GET /player/me | player token → {player,expiresAt} |
| POST /player/auth/logout | ปิดเซสชันผู้เล่นปัจจุบัน |
| POST /player/auth/password | {currentPassword,newPassword} → ต้องเข้าสู่ระบบใหม่ |
| POST /player/auth/revoke-sessions | {currentPassword} → ยกเลิกทุกเซสชัน |
| GET /players?search=&before=&limit=50 | admin → {players,nextCursor} |
| GET /player-settings | admin → นโยบายสมัครผู้เล่น |
| POST /player-settings | admin: {registrationEnabled,revision,confirmation} |
| POST /players/:id/status | admin: {status,revision,confirmation} |
| POST /players/:id/revoke-sessions | admin: {revision,confirmation} |

เปิดรับสมัครตามค่าเริ่มต้นของ Backend แต่หน้าเว็บใช้สถานะ API จริงเสมอ หากตรวจสถานะไม่ได้จะปิดปุ่มสมัครและแจ้งข้อผิดพลาด Backend จำกัดอัตราสมัคร/ล็อกอิน/คำสั่งสำคัญ เมื่อถูกจำกัดจะแสดงเหตุผลจาก API โดยไม่ลองส่งอัตโนมัติ

Workflow GitHub Pages ตรวจ syntax player.js และรวม player.html/player.js/player.css ใน public artifact ด้วย การทดสอบบัญชีใหม่ใช้ฐาน staging แยกจากข้อมูลผู้เล่นจริง

## Manager 1.4 — ทีม คำท้า และสุ่มจับคู่ทดสอบ

player.html เพิ่มพื้นที่ทีมของฉัน คำท้าทดสอบ สุ่มจับคู่ และผลทดสอบร่วมของฉัน ทุกงานเป็น TEST ONLY เพื่อทดสอบการรับส่งข้อมูล ยังไม่ใช่ผลต่อสู้เกมจริง หน้าเว็บไม่เปิดให้เลือก seed, arena หรือ runner เอง และไม่ใช้เหตุการณ์ Fixture สรุปสมดุลเกม

ทีมใช้ JSON envelope {schemaVersion:1,name,contentVersion,characters:[{id,data:{}}]} จำนวน 1–3 ตัวละคร สูงสุด 16 KiB ข้อมูล data เก็บตามต้นฉบับ ทีมได้รับการตรวจเฉพาะโครงสร้างและยังเป็น client-submitted ผู้เล่นโหลดตัวอย่าง fixture-v1 เพื่อเติมฟอร์มได้ แต่ต้องกดบันทึกก่อนสร้างข้อมูลจริง แก้ไขทีมด้วย revision ล่าสุดและเปิดประวัติ revision แบบอ่านอย่างเดียวได้

คำท้าระบุผู้รับด้วย username และเลือกทีมที่บันทึกไว้ ฝ่ายรับเลือกทีมและยืนยัน ACCEPT TEST CHALLENGE ก่อนเซิร์ฟเวอร์สร้างแมตช์ ทั้งสองฝ่ายดูเฉพาะคำท้าและแมตช์ของตนเอง ฝ่ายรับปฏิเสธได้ ฝ่ายส่งยกเลิกได้ก่อนตอบรับ หากคำยินยอมสิ้นสุดเพราะการเปลี่ยนรหัส/เพิกถอนเซสชัน/ระงับบัญชี ให้ส่งคำท้าใหม่ตามข้อผิดพลาด CONSENT_INVALIDATED จากเซิร์ฟเวอร์

คิวสุ่มให้ผู้เล่นยืนยัน JOIN TEST MATCHMAKING ก่อนเข้าคิว ไม่กรอกชื่อคู่แข่ง เซิร์ฟเวอร์สุ่มจากผู้เล่นที่รอและเข้ากันได้ มีคิวรอได้ 1 รายการต่อบัญชี อายุ 10 นาที ทีมและ revision ล็อกตอนเข้าคิว เมื่อจับคู่แล้วเปิดผลจากประวัติร่วมได้ การลองคำสั่งเดิมใช้คีย์เดิมแม้คิวสิ้นสุดแล้ว ต้องเริ่มคำสั่งคิวใหม่เพื่อเข้ารอบใหม่ หากยกเลิกแพ้การจับคู่ หน้าเว็บอ่านสถานะล่าสุดและแสดงแมตช์แทนการอ้างว่ายกเลิกสำเร็จ

แอดมินเลือกเปิด/ปิดคำท้าและสุ่มจับคู่แยกกันจาก #players ส่ง fixtureChallengesEnabled และ fixtureMatchmakingEnabled ครบทั้งสองค่าพร้อม shared revision และ confirmation UPDATE PLAYER FIXTURE MODES ผ่าน /player-arena-settings ทั้งสองโหมดเริ่มต้นปิด การแก้ config ทำให้คิวสุ่มเดิม invalidated ต้องเข้าคิวใหม่ และไม่เปลี่ยนทะเบียน manager-fixture เดิม ตัวทดสอบ manager-fixture ต้องเปิดและพร้อมรับงานด้วยจึงจะสร้างงานสำเร็จ ตัวรันเกมจริงยังรอรับมอบ

| คำขอ | ขอบเขต |
| --- | --- |
| GET /player/arena/config | สถานะ fixture-only และ limits ของผู้เล่น |
| GET/POST /player/teams | ทีมที่บัญชีนี้เป็นเจ้าของ; POST ใช้ Idempotency-Key |
| GET/PUT /player/teams/:id | อ่านทีม/บันทึก {revision,team} |
| GET /player/teams/:id/revisions | ประวัติ revision พร้อม hash |
| GET /player/teams/:id/revisions/:revision | ข้อมูลรุ่นที่เลือกแบบอ่านอย่างเดียว |
| GET/POST /player/challenges | คำท้าของฉัน; POST {mode:'fixture',opponentUsername,teamId,teamRevision} + Idempotency-Key |
| GET /player/challenges/:id | รายละเอียดคำท้าที่เป็นคู่ทดสอบ |
| POST /player/challenges/:id/accept | {revision,teamId,teamRevision,confirmation} + Idempotency-Key |
| POST /player/challenges/:id/decline หรือ /cancel | {revision} |
| POST /player/arena/queue | {mode:'fixture',teamId,teamRevision,confirmation:'JOIN TEST MATCHMAKING'} + Idempotency-Key |
| GET /player/arena/queue/current | {entry} ล่าสุด รวม waiting/matched/cancelled/expired/invalidated |
| GET /player/arena/queue/:id | คิวของเจ้าของเท่านั้น |
| POST /player/arena/queue/:id/cancel | {revision} |
| GET /player/matches และ /player/matches/:id | ผลที่บัญชีนี้เข้าร่วม แสดงทีมตนเองและเฉพาะข้อมูลคู่ทดสอบที่ API อนุญาต |
| GET/POST /player-arena-settings | สิทธิ์แอดมิน; ส่งทั้งสองค่า boolean พร้อม revision และ UPDATE PLAYER FIXTURE MODES |

player-arena.js เรียก API ผ่านเซสชันใน player.js ไม่มีสำเนา token หรือ storage เพิ่ม คีย์สร้างทีม/สร้างคำท้า/ยอมรับ/เข้าคิวอยู่ใน memory และเทียบ JSON แบบเรียง object keys เพื่อให้ลองคำสั่งเดิมหลังเครือข่ายขัดข้องได้โดยไม่สร้างซ้ำ ล้างข้อมูลทุกหน้าและคีย์เมื่อออกจากระบบ การติดตามคิว waiting และแมตช์ queued/running ทำทุก 5 วินาทีไม่เกิน 60 วินาที เฉพาะเมื่อเปิดผลนั้นอยู่ หยุดเมื่อเปลี่ยนหน้า ซ่อนหน้า หรือ logout แล้วผู้เล่นกดโหลดผลต่อได้เอง
