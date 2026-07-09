-- CREATE TABLE master_wilayah_bps
CREATE TABLE IF NOT EXISTS master_wilayah_bps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kecamatan VARCHAR(100) NOT NULL,
    kode_kecamatan_bps VARCHAR(50) NOT NULL,
    no_kode_bps VARCHAR(50) NOT NULL,
    kelurahan VARCHAR(100) NOT NULL UNIQUE,
    kode_kelurahan_bps VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ENABLE RLS
ALTER TABLE master_wilayah_bps ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY
CREATE POLICY "Allow public read access to master_wilayah_bps" 
ON master_wilayah_bps FOR SELECT 
TO public 
USING (true);

-- INSERT OR UPDATE BPS MASTER DATA
INSERT INTO master_wilayah_bps (kecamatan, kode_kecamatan_bps, no_kode_bps, kelurahan, kode_kelurahan_bps)
VALUES
('Ciwandan', '3672010', '3672010001', 'Gunung Sugih', '3672010001'),
('Ciwandan', '3672010', '3672010002', 'Kepuh', '3672010002'),
('Ciwandan', '3672010', '3672010003', 'Randakari', '3672010003'),
('Ciwandan', '3672010', '3672010004', 'Tegal Ratu', '3672010004'),
('Ciwandan', '3672010', '3672010005', 'Banjar Negara', '3672010005'),
('Ciwandan', '3672010', '3672010013', 'Kubangsari', '3672010013'),
('Citangkil', '3672011', '3672011006', 'Deringo', '3672011006'),
('Citangkil', '3672011', '3672011007', 'Lebak Denok', '3672011007'),
('Citangkil', '3672011', '3672011008', 'Taman Baru', '3672011008'),
('Citangkil', '3672011', '3672011009', 'Citangkil', '3672011009'),
('Citangkil', '3672011', '3672011010', 'Kebonsari', '3672011010'),
('Citangkil', '3672011', '3672011011', 'Warnasari', '3672011011'),
('Citangkil', '3672011', '3672011012', 'Samangraya', '3672011012'),
('Pulomerak', '3672020', '3672020011', 'Mekarsari', '3672020011'),
('Pulomerak', '3672020', '3672020012', 'Tamansari', '3672020012'),
('Pulomerak', '3672020', '3672020013', 'Lebakgede', '3672020013'),
('Pulomerak', '3672020', '3672020014', 'Suralaya', '3672020014'),
('Purwakarta', '3672021', '3672021001', 'Ramanuju', '3672021001'),
('Purwakarta', '3672021', '3672021002', 'Kebon Dalem', '3672021002'),
('Purwakarta', '3672021', '3672021003', 'Purwakarta', '3672021003'),
('Purwakarta', '3672021', '3672021004', 'Tegal Bunder', '3672021004'),
('Purwakarta', '3672021', '3672021005', 'Pabean', '3672021005'),
('Purwakarta', '3672021', '3672021006', 'Kotabumi', '3672021006'),
('Gerogol', '3672022', '3672022007', 'Kotasari', '3672022007'),
('Gerogol', '3672022', '3672022008', 'Gerogol', '3672022008'),
('Gerogol', '3672022', '3672022009', 'Rawa Arum', '3672022009'),
('Gerogol', '3672022', '3672022010', 'Gerem', '3672022010'),
('Cilegon', '3672030', '3672030001', 'Bagendung', '3672030001'),
('Cilegon', '3672030', '3672030002', 'Ciwedus', '3672030002'),
('Cilegon', '3672030', '3672030003', 'Bendungan', '3672030003'),
('Cilegon', '3672030', '3672030004', 'Ciwaduk', '3672030004'),
('Cilegon', '3672030', '3672030005', 'Ketileng', '3672030005'),
('Jombang', '3672031', '3672031001', 'Jombang Wetan', '3672031001'),
('Jombang', '3672031', '3672031002', 'Masigit', '3672031002'),
('Jombang', '3672031', '3672031003', 'Panggung Rawi', '3672031003'),
('Jombang', '3672031', '3672031004', 'Gedong Dalem', '3672031004'),
('Jombang', '3672031', '3672031005', 'Sukmajaya', '3672031005'),
('Cibeber', '3672040', '3672040001', 'Bulakan', '3672040001'),
('Cibeber', '3672040', '3672040002', 'Cikerai', '3672040002'),
('Cibeber', '3672040', '3672040003', 'Kalitimbang', '3672040003'),
('Cibeber', '3672040', '3672040004', 'Karang Asem', '3672040004'),
('Cibeber', '3672040', '3672040005', 'Cibeber', '3672040005'),
('Cibeber', '3672040', '3672040006', 'Kedaleman', '3672040006')
ON CONFLICT (kelurahan) 
DO UPDATE SET 
    kecamatan = EXCLUDED.kecamatan,
    kode_kecamatan_bps = EXCLUDED.kode_kecamatan_bps,
    no_kode_bps = EXCLUDED.no_kode_bps,
    kode_kelurahan_bps = EXCLUDED.kode_kelurahan_bps;
