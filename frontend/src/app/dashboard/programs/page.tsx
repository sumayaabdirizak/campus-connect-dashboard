import PageContainer from '@/components/layout/page-container';
import ProgramsListingPage from '@/features/programs/components/programs-listing';
import { ProgramAddButton } from '@/features/programs/components/ProgramAddButton';

export default function Page() {
  return (
    <PageContainer
      pageTitle='Programs'
      pageDescription='Manage academic programs.'
      pageHeaderAction={<ProgramAddButton />}
    >
      <ProgramsListingPage />
    </PageContainer>
  );
}
