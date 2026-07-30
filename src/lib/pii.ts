// 參加者個資（身分證號、生日、緊急聯絡人）的驗證與遮罩。
// 蒐集目的為活動投保，資料存於 booking_participants。
//
// 本檔只做兩件事：進來時擋掉髒資料、出去時不送出完整值。
//
// ⚠️ 尚未處理：保存期限與到期清除。
// 個資法第 11 條第 3 項（民國 114-11-11 修正版）規定，特定目的消失或期限屆滿
// 時應「刪除、停止處理或利用」（三擇一）。目前 booking_participants 沒有任何
// 到期機制，資料永久保存——這是已知的法遵缺口，待小江向保險公司確認參加者
// 名冊的要求保存期限後再實作。
//
// 實作時的注意事項（2026-07-28 查證）：
//   - 部分遮蔽 **不等於** 去識別化。法務部函釋的標準是「無從直接或間接識別」，
//     而本表同列仍有姓名與預約紀錄，遮掉幾碼身分證號後仍屬個資，不可因此
//     認定已脫離個資法適用。
//   - 施行細則第 12 條第 2 項第 10 款要求「使用紀錄、軌跡資料及證據保存」，
//     故清除動作需留 log（僅記筆數與時間，不得記個資內容）。條文未定年限，
//     坊間流傳的「必須保存 5 年」為特定行業別辦法，不適用本專案。

// 中華民國身分證字號的字母對應值
const LETTER_VALUES: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18,
  K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27,
  U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
};

/** 檢查是否為格式與檢查碼皆正確的中華民國身分證字號。 */
export function isValidTwId(value: string): boolean {
  const id = value.toUpperCase();
  // 第 2 碼：1/2 為國人性別碼，8/9 為新式外來人口統一證號
  if (!/^[A-Z][1289]\d{8}$/.test(id)) return false;

  const letterValue = LETTER_VALUES[id[0]];
  if (letterValue === undefined) return false;

  let sum = Math.floor(letterValue / 10) + (letterValue % 10) * 9;
  for (let i = 1; i <= 8; i++) {
    sum += Number(id[i]) * (9 - i);
  }
  sum += Number(id[9]);

  return sum % 10 === 0;
}

/**
 * 驗證參加者證件號碼。
 *
 * 本站有 EN 版與國際配送，體驗活動會有外籍參加者，因此不能只收台灣身分證——
 * 硬性套用檢查碼會讓外國旅客無法報名。規則：
 *   - 長得像台灣身分證（英文字母 + 9 碼數字）→ 必須通過檢查碼
 *   - 其他 → 視為護照號碼，只要求 6–20 碼英數字
 * 這樣既擋得掉亂填，也不會把外籍旅客擋在門外。
 */
export function validateIdNumber(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim().toUpperCase();

  if (value.length < 6 || value.length > 20) {
    return { ok: false, error: "證件號碼長度不正確（6–20 碼）" };
  }

  if (/^[A-Z]\d{9}$/.test(value)) {
    if (!isValidTwId(value)) {
      return { ok: false, error: "身分證字號格式錯誤，請確認是否輸入正確" };
    }
    return { ok: true, value };
  }

  if (!/^[A-Z0-9]+$/.test(value)) {
    return { ok: false, error: "證件號碼只能包含英文字母與數字" };
  }

  return { ok: true, value };
}

/**
 * 遮罩證件號碼：保留前 3 碼與後 2 碼，中間以 * 取代。
 * 例：A123456789 → A12*****89
 * 短號碼（≤5 碼）全部遮蔽，避免反推。
 */
export function maskIdNumber(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 5) return "*".repeat(value.length);
  return value.slice(0, 3) + "*".repeat(value.length - 5) + value.slice(-2);
}

/** 遮罩電話：保留末 3 碼。例：0912345678 → *******678 */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 3) return "*".repeat(value.length);
  return "*".repeat(value.length - 3) + value.slice(-3);
}

/** 遮罩生日：只留年份。例：1990-05-12 → 1990-**-** */
export function maskDateOfBirth(value: string | null | undefined): string {
  if (!value) return "";
  const year = value.slice(0, 4);
  return /^\d{4}$/.test(year) ? `${year}-**-**` : "****-**-**";
}

type ParticipantRow = {
  id_number?: string | null;
  date_of_birth?: string | null;
  emergency_contact_phone?: string | null;
  [key: string]: unknown;
};

/**
 * 把參加者資料轉成可安全回傳給前端的形式。
 *
 * 即使是本人查看自己的預約，也沒有理由把完整身分證號再送回瀏覽器一次——
 * 填寫當下前端已有該值，之後的查看只需要能辨識「填的是哪一筆」。
 */
export function maskParticipant<T extends ParticipantRow>(p: T): T {
  return {
    ...p,
    id_number: maskIdNumber(p.id_number),
    date_of_birth: maskDateOfBirth(p.date_of_birth),
    emergency_contact_phone: maskPhone(p.emergency_contact_phone),
  };
}
