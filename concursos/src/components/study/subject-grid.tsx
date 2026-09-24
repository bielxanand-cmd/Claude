import type { StatusMap } from '@/domain/progress'
import { subjectProgress } from '@/domain/progress'
import type { PlanSubject } from '@/domain/types'
import { SubjectCard } from './subject-card'

export function SubjectGrid({ subjects, statuses }: { subjects: PlanSubject[]; statuses: StatusMap }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map((subject) => (
        <SubjectCard key={subject.subject.id} subject={subject} progress={subjectProgress(subject, statuses)} />
      ))}
    </div>
  )
}
