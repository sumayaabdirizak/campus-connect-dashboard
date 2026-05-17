import PageContainer from '@/components/layout/page-container';
import { FacultyFormSheetTrigger } from '@/features/faculties/components/FacultyFormSheetTrigger';
import FacultyListingPage from '@/features/faculties/components/faculty-listing'; // Or your actual listing/table
import { facultiesInfoContent } from '@/features/faculties/info-content';

export const metadata = {
  title: 'Dashboard: Faculties'
};

export default function Page() {
  return (
    <PageContainer
      scrollable={false}
      pageTitle='Faculties'
      pageDescription='Create, manage, and organize university faculties. After creating a faculty, you can assign a dean and add departments, programs, and more.'
      infoContent={facultiesInfoContent}
      pageHeaderAction={<FacultyFormSheetTrigger />}
    >
      <FacultyListingPage />
    </PageContainer>
  );
}
