/**
 * アプリケーション共通定数
 */

// 休暇種別ラベル
const LEAVE_TYPE_LABELS = {
    PAID_LEAVE: '有休',
    SUMMER: '夏季',
    WINTER: '冬季',
    SPECIAL: '特別'
};

// 休暇時間単位ラベル
const LEAVE_TIME_UNIT_LABELS = {
    FULL_DAY: '',
    HALF_AM: 'AM',
    HALF_PM: 'PM'
};

// 休暇時間単位マーカー
const LEAVE_TIME_UNIT_MARKERS = {
    FULL_DAY: '',
    HALF_AM: 'AM有休',
    HALF_PM: 'PM有休'
};

// 勤務時間関連の定数
const WORK_TIME_CONSTANTS = {
    STANDARD_WORKING_MINUTES: 480,  // 標準勤務時間（8時間）
    HALF_DAY_WORKING_MINUTES: 240   // 半休は一律4時間
};

// グローバルに公開
window.LEAVE_TYPE_LABELS = LEAVE_TYPE_LABELS;
window.LEAVE_TIME_UNIT_LABELS = LEAVE_TIME_UNIT_LABELS;
window.LEAVE_TIME_UNIT_MARKERS = LEAVE_TIME_UNIT_MARKERS;
window.WORK_TIME_CONSTANTS = WORK_TIME_CONSTANTS;
