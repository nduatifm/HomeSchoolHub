-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "favoriteSubject" TEXT,
ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "learningGoals" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "preferredContact" TEXT,
ADD COLUMN     "qualifications" TEXT,
ADD COLUMN     "specialization" TEXT,
ADD COLUMN     "teachingSubjects" TEXT[],
ADD COLUMN     "yearsExperience" INTEGER;
