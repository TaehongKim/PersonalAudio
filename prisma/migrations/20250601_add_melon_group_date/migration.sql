-- 멜론차트 그룹 중 groupName에 날짜(8자리)가 없는 경우, 오늘 날짜를 붙여서 업데이트
-- 예: TOP30 → TOP30_20240601

-- SQLite 기준 (Prisma 기본)
UPDATE "File"
SET "groupName" = "groupName" || '_' || strftime('%Y%m%d', 'now', 'localtime')
WHERE "groupType" = 'melon_chart' AND "groupName" NOT LIKE '%_[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'; 