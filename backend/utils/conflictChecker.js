/**
 * Time and Conflict Checking Utilities
 */

// Converts HH:mm (24hr, 12hr with AM/PM, or dot-notation e.g. 2.00 PM) into minutes from 00:00
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);

  // Replace dots in time e.g. "2.00" -> "2:00"
  const cleanTime = str.replace(/am|pm/gi, '').trim().replace('.', ':');
  const parts = cleanTime.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0;

  if (isNaN(hours)) return 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
};

// Check if two time intervals overlap (assuming both on the same date)
const doIntervalsOverlap = (start1, end1, start2, end2) => {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);

  // Overlap condition: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1;
};

// Format date into YYYY-MM-DD
const formatDateStr = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    // If it's already YYYY-MM-DD or DD.MM.YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateVal)) {
      const [d, m, y] = dateVal.split('.');
      return `${y}-${m}-${d}`;
    }
    return dateVal.split('T')[0];
  }
  const d = new Date(dateVal);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Check if two exams/slots overlap in date and time
const doExamsOverlap = (exam1, exam2) => {
  if (exam1._id && exam2._id && exam1._id.toString() === exam2._id.toString()) {
    return false;
  }
  const date1 = formatDateStr(exam1.date || exam1.examDate);
  const date2 = formatDateStr(exam2.date || exam2.examDate);

  if (date1 !== date2) {
    return false;
  }

  return doIntervalsOverlap(exam1.startTime, exam1.endTime, exam2.startTime, exam2.endTime);
};

module.exports = {
  parseTimeToMinutes,
  doIntervalsOverlap,
  formatDateStr,
  doExamsOverlap,
};
