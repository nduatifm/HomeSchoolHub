-- Make parentId nullable on child_team_members to support pending invites
-- where the invitee may not have an account yet.
ALTER TABLE "child_team_members" ALTER COLUMN "parentId" DROP NOT NULL;
