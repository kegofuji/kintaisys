(function (global) {
    const pad = (value) => String(value).padStart(2, '0');

    const calcVernalEquinoxDay = (year) => {
        if (year < 1900 || year > 2099) return 20;
        return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    };

    const calcAutumnalEquinoxDay = (year) => {
        if (year < 1900 || year > 2099) return 23;
        return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
    };

    const addNthMonday = (set, year, month, n) => {
        const first = new Date(year, month - 1, 1);
        const firstDay = first.getDay();
        const firstMondayDate = 1 + ((8 - firstDay) % 7);
        const targetDate = firstMondayDate + 7 * (n - 1);
        const daysInMonth = new Date(year, month, 0).getDate();
        if (targetDate <= daysInMonth) {
            set.add(`${year}-${pad(month)}-${pad(targetDate)}`);
        }
    };

    const applySubstituteHolidays = (baseSet, year) => {
        const result = new Map();
        for (const entry of baseSet) {
            result.set(entry, entry);
        }
        for (const entry of baseSet) {
            const current = new Date(entry);
            if (current.getFullYear() !== year) continue;
            if (current.getDay() !== 0) continue;

            let next = new Date(current);
            while (next.getFullYear() === year) {
                next.setDate(next.getDate() + 1);
                const key = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
                if (!result.has(key) && next.getDay() >= 1 && next.getDay() <= 6) {
                    result.set(key, key);
                    break;
                }
            }
        }
        return result;
    };

    const applyCitizensHoliday = (holidayMap, year) => {
        const result = new Map(holidayMap);
        const isHoliday = (date) => {
            const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
            return result.has(key);
        };

        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let day = 2; day <= daysInMonth - 1; day++) {
                const current = new Date(year, month, day);
                if (current.getDay() === 0 || current.getDay() === 6) continue;
                const prev = new Date(year, month, day - 1);
                const next = new Date(year, month, day + 1);
                if (isHoliday(prev) && isHoliday(next) && !isHoliday(current)) {
                    const key = `${year}-${pad(month + 1)}-${pad(day)}`;
                    result.set(key, key);
                }
            }
        }
        return result;
    };

    const buildHolidaySet = (year) => {
        const base = new Set();
        const add = (m, d) => base.add(`${year}-${pad(m)}-${pad(d)}`);

        add(1, 1);   // 元日
        add(2, 11);  // 建国記念の日
        add(4, 29);  // 昭和の日
        add(5, 3);   // 憲法記念日
        add(5, 4);   // みどりの日
        add(5, 5);   // こどもの日
        add(8, 11);  // 山の日
        add(11, 3);  // 文化の日
        add(11, 23); // 勤労感謝の日
        add(12, 23); // 旧天皇誕生日（互換目的）

        addNthMonday(base, year, 1, 2);  // 成人の日
        addNthMonday(base, year, 7, 3);  // 海の日
        addNthMonday(base, year, 9, 3);  // 敬老の日
        addNthMonday(base, year, 10, 2); // スポーツの日

        const vernal = calcVernalEquinoxDay(year);
        const autumnal = calcAutumnalEquinoxDay(year);
        add(3, vernal);
        add(9, autumnal);

        const withSubstitute = applySubstituteHolidays(base, year);
        const withCitizens = applyCitizensHoliday(withSubstitute, year);

        return new Set(withCitizens.keys());
    };

    const cache = new Map();

    const getHolidaysForYear = (year) => {
        if (!cache.has(year)) {
            cache.set(year, buildHolidaySet(year));
        }
        return cache.get(year);
    };

    const BusinessDayUtils = {
        isWeekend(date) {
            const day = date.getDay();
            return day === 0 || day === 6;
        },
        isHoliday(date) {
            const holidays = getHolidaysForYear(date.getFullYear());
            const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
            return holidays.has(key);
        },
        isBusinessDay(date) {
            return !this.isWeekend(date) && !this.isHoliday(date);
        }
    };

    global.BusinessDayUtils = BusinessDayUtils;
})(window);
