# Guild Arena — Server Manager Dashboard

Dashboard ภาษาไทยสำหรับ Guild Arena v1 ใช้ HTML, CSS และ JavaScript ES modules โดยไม่มีขั้นตอน build หรือ dependency ภายนอก เผยแพร่เป็นเว็บสาธารณะผ่าน GitHub Pages ส่วนข้อมูลและคำสั่งจัดการทุกอย่างเรียก Backend บน VPS ซึ่งต้องยืนยันสิทธิ์แอดมิน

## เปิดใช้งาน

1. กำหนด URL สาธารณะของ API ใน `config.js` โดยไม่ใส่ `/api/v1` ต่อท้าย หรือแก้ช่องปลายทาง API บนหน้าล็อกอิน
2. ให้ Backend อนุญาต CORS origin ของ GitHub Pages: `https://nustanakritwithai.github.io` รวม header `Authorization`, `Content-Type`, `Idempotency-Key` และ method ที่ใช้งาน
3. เปิด GitHub Pages แล้วเข้าสู่ระบบด้วยบัญชีผู้ดูแลที่สร้างบน Backend ไม่มีรหัสผ่านหรือคีย์เริ่มต้นใน repo นี้
4. สร้างสองทีมจากหน้า “ทีมจำลอง” แล้วเลือกทั้งสองทีมในหน้า “เริ่มการต่อสู้”

ปลายทางที่ตั้งไว้คือ `https://guild-arena.157.85.96.139.sslip.io` ต้องให้ VPS ตั้ง HTTPS และ API พร้อมก่อนจึงจะล็อกอินได้ URL API อนุญาต HTTPS หรือ HTTP เฉพาะ localhost, 127.0.0.1 และ ::1 สำหรับทดสอบ

สำหรับทดสอบหน้าเว็บในเครื่อง ใช้ static HTTP server เช่น `python -m http.server 8085 --bind 127.0.0.1` แล้วเปิด `http://127.0.0.1:8085` ต้องเพิ่ม origin นี้ใน CORS ของ Backend ทดสอบด้วย การเปิด `index.html` ผ่าน file:// ใช้ ES modules ไม่ได้

## หน้าที่มี

- ภาพรวม: สถานะ API, worker, คิว, จำนวนแมตช์ และแมตช์ล่าสุดจาก API จริง
- ทีมจำลอง: สร้างและแก้ไข JSON ทีม 3 ตัวละคร พร้อม revision และการตรวจข้อมูลเบื้องต้น ตัวอย่างเติมแบบฟอร์มเท่านั้น ต้องกดบันทึกก่อนสร้างข้อมูลจริง
- เริ่มการต่อสู้: เลือกสองทีม ล็อก revision, seed uint32 และ rulesVersion `prototype-v1`
- ประวัติแมตช์: กรองสถานะและอ่านผล รายละเอียดทีม seed และ hash
- Snapshot และรีเพลย์: แสดงลำดับเหตุการณ์ พร้อมก่อนหน้า/ถัดไป/เล่น/เลื่อนตำแหน่ง ดาวน์โหลด JSON และให้เซิร์ฟเวอร์ตรวจการจำลองซ้ำ
- คิวและข้อผิดพลาด: แสดงงานทั้งหมดที่ API ส่งมา ลองใหม่เฉพาะงานสถานะ failed
- สำรองและกู้คืน: สร้าง Backup ด้วยตนเอง ดูประวัติทดสอบกู้คืน โดยต้องพิมพ์ `RESTORE TEST` ยืนยันก่อนส่งคำขอ

รุ่นนี้ไม่มีตาราง Backup อัตโนมัติ Backend จำกัด 20 Backup และ 40 ผลทดสอบกู้คืน เมื่อเต็มผู้ดูแลต้องจัดการบนเซิร์ฟเวอร์อย่างยืนยัน ไม่มีการลบอัตโนมัติ และ Dashboard ไม่มีคำสั่งกู้ทับฐานใช้งาน

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
| GET `/system/status` | `{api,worker,queue,matches,database,backup}` |
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
