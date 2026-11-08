// Regions imported from Overture Maps beyond Mumbai (human decision, 2026-11-08): the big metros
// plus India's main tourist towns. Bounding boxes are hand-drawn around each city's eating and
// sightseeing core (lng/lat, WGS84). Mumbai keeps its own district-clipped import.

export type Region = {
  slug: string;
  name: string;
  state: string;
  kind: 'metro' | 'tourist';
  bbox: { xmin: number; xmax: number; ymin: number; ymax: number };
};

const r = (
  slug: string,
  name: string,
  state: string,
  kind: Region['kind'],
  xmin: number,
  xmax: number,
  ymin: number,
  ymax: number,
): Region => ({ slug, name, state, kind, bbox: { xmin, xmax, ymin, ymax } });

export const REGIONS: Region[] = [
  // Metros
  r('delhi', 'Delhi NCR', 'Delhi', 'metro', 76.84, 77.55, 28.4, 28.88),
  r('bengaluru', 'Bengaluru', 'Karnataka', 'metro', 77.45, 77.78, 12.83, 13.14),
  r('hyderabad', 'Hyderabad', 'Telangana', 'metro', 78.3, 78.63, 17.28, 17.56),
  r('chennai', 'Chennai', 'Tamil Nadu', 'metro', 80.13, 80.32, 12.9, 13.2),
  r('kolkata', 'Kolkata', 'West Bengal', 'metro', 88.25, 88.48, 22.45, 22.65),
  r('pune', 'Pune', 'Maharashtra', 'metro', 73.75, 74.0, 18.42, 18.64),
  r('ahmedabad', 'Ahmedabad', 'Gujarat', 'metro', 72.48, 72.7, 22.93, 23.12),
  r('jaipur', 'Jaipur', 'Rajasthan', 'metro', 75.7, 75.9, 26.8, 27.0),
  r('lucknow', 'Lucknow', 'Uttar Pradesh', 'metro', 80.86, 81.05, 26.78, 26.93),
  r('chandigarh', 'Chandigarh', 'Chandigarh', 'metro', 76.68, 76.86, 30.65, 30.79),
  // Tourist towns
  r('north-goa', 'North Goa', 'Goa', 'tourist', 73.72, 73.9, 15.46, 15.72),
  r('south-goa', 'South Goa', 'Goa', 'tourist', 73.88, 74.06, 15.15, 15.4),
  r('udaipur', 'Udaipur', 'Rajasthan', 'tourist', 73.64, 73.75, 24.54, 24.62),
  r('jodhpur', 'Jodhpur', 'Rajasthan', 'tourist', 72.98, 73.07, 26.24, 26.32),
  r('jaisalmer', 'Jaisalmer', 'Rajasthan', 'tourist', 70.88, 70.95, 26.89, 26.94),
  r('agra', 'Agra', 'Uttar Pradesh', 'tourist', 77.95, 78.1, 27.13, 27.22),
  r('varanasi', 'Varanasi', 'Uttar Pradesh', 'tourist', 82.94, 83.05, 25.26, 25.36),
  r('rishikesh', 'Rishikesh', 'Uttarakhand', 'tourist', 78.25, 78.35, 30.07, 30.15),
  r('haridwar', 'Haridwar', 'Uttarakhand', 'tourist', 78.1, 78.2, 29.92, 29.99),
  r('mussoorie', 'Mussoorie', 'Uttarakhand', 'tourist', 78.04, 78.1, 30.44, 30.47),
  r('nainital', 'Nainital', 'Uttarakhand', 'tourist', 79.43, 79.48, 29.37, 29.4),
  r('manali', 'Manali', 'Himachal Pradesh', 'tourist', 77.15, 77.21, 32.21, 32.28),
  r('shimla', 'Shimla', 'Himachal Pradesh', 'tourist', 77.14, 77.22, 31.08, 31.12),
  r('dharamshala', 'Dharamshala', 'Himachal Pradesh', 'tourist', 76.3, 76.34, 32.2, 32.25),
  r('amritsar', 'Amritsar', 'Punjab', 'tourist', 74.82, 74.93, 31.6, 31.67),
  r('leh', 'Leh', 'Ladakh', 'tourist', 77.55, 77.6, 34.14, 34.18),
  r('darjeeling', 'Darjeeling', 'West Bengal', 'tourist', 88.24, 88.29, 27.02, 27.06),
  r('gangtok', 'Gangtok', 'Sikkim', 'tourist', 88.59, 88.64, 27.31, 27.36),
  r('kochi', 'Kochi', 'Kerala', 'tourist', 76.22, 76.33, 9.92, 10.05),
  r('munnar', 'Munnar', 'Kerala', 'tourist', 77.03, 77.09, 10.06, 10.11),
  r('alleppey', 'Alleppey', 'Kerala', 'tourist', 76.3, 76.36, 9.47, 9.52),
  r('mysuru', 'Mysuru', 'Karnataka', 'tourist', 76.6, 76.7, 12.26, 12.35),
  r('hampi', 'Hampi', 'Karnataka', 'tourist', 76.43, 76.49, 15.31, 15.36),
  r('ooty', 'Ooty', 'Tamil Nadu', 'tourist', 76.68, 76.73, 11.39, 11.43),
  r('puducherry', 'Puducherry', 'Puducherry', 'tourist', 79.79, 79.85, 11.9, 11.96),
  r('khajuraho', 'Khajuraho', 'Madhya Pradesh', 'tourist', 79.9, 79.94, 24.83, 24.87),
  r('lonavala', 'Lonavala', 'Maharashtra', 'tourist', 73.38, 73.43, 18.73, 18.77),
  r('mahabaleshwar', 'Mahabaleshwar', 'Maharashtra', 'tourist', 73.64, 73.68, 17.91, 17.94),
];
