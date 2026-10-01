// A single conditional INSERT makes overlap and capacity checks atomic in D1.
export const INSERT_BOOKING = `
INSERT INTO bookings (id,name,phone,date,start,duration,inside,outside,created,fluid,price,large_car,polish)
SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?
WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE date=? AND start<? AND start+duration>?)
AND (SELECT COUNT(*) FROM bookings WHERE date=?) < 4
AND (SELECT COUNT(*) FROM bookings WHERE date=? AND start>=? AND start<?) < 2
AND NOT EXISTS (SELECT 1 FROM closed_dates WHERE date=?)
`;
