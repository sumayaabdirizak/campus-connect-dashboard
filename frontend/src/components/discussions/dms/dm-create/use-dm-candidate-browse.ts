'use client'

import { useMemo, useState } from 'react'
import type { GroupDmCandidate } from '@/lib/discussions/queries/types'
import {
  filterByBatch,
  filterByDepartment,
  filterBySection,
  isStaffBatch,
  listBatches,
  listDepartments,
  listSections,
  type HierarchyNode,
  type HierarchyStep,
} from './candidate-hierarchy'

export function useDmCandidateBrowse(candidates: GroupDmCandidate[]) {
  const [step, setStep] = useState<HierarchyStep>('department')
  const [dept, setDept] = useState<HierarchyNode | null>(null)
  const [batch, setBatch] = useState<HierarchyNode | null>(null)
  const [section, setSection] = useState<HierarchyNode | null>(null)

  const departments = useMemo(() => listDepartments(candidates), [candidates])
  const inDept = useMemo(
    () => (dept ? filterByDepartment(candidates, dept) : []),
    [candidates, dept]
  )
  const batches = useMemo(() => listBatches(inDept), [inDept])
  const inBatch = useMemo(() => (batch ? filterByBatch(inDept, batch) : []), [inDept, batch])
  const sections = useMemo(() => listSections(inBatch), [inBatch])
  const people = useMemo(() => {
    if (step !== 'people') return []
    if (batch && isStaffBatch(batch)) return inBatch
    if (section) return filterBySection(inBatch, section)
    if (batch) return inBatch
    return inDept
  }, [step, batch, section, inBatch, inDept])

  const goBack = () => {
    if (step === 'people') {
      if (batch && isStaffBatch(batch)) {
        setBatch(null)
        setStep('batch')
        return
      }
      if (!batch && !section) {
        setDept(null)
        setStep('department')
        return
      }
      setSection(null)
      setStep('section')
      return
    }
    if (step === 'section') {
      setBatch(null)
      setStep('batch')
      return
    }
    if (step === 'batch') {
      setDept(null)
      setStep('department')
    }
  }

  const pickDepartment = (n: HierarchyNode) => {
    setDept(n)
    setBatch(null)
    setSection(null)
    const inD = filterByDepartment(candidates, n)
    const bs = listBatches(inD)
    const studentBatches = bs.filter((b) => !isStaffBatch(b))
    if (studentBatches.length === 0) {
      const staff = bs.find((b) => isStaffBatch(b)) ?? null
      setBatch(staff)
      setStep('people')
      return
    }
    setStep('batch')
  }

  const pickBatch = (n: HierarchyNode) => {
    setBatch(n)
    setSection(null)
    if (isStaffBatch(n)) setStep('people')
    else setStep('section')
  }

  const pickSection = (n: HierarchyNode) => {
    setSection(n)
    setStep('people')
  }

  const crumb =
    step === 'department'
      ? '1 · Choose department'
      : step === 'batch'
        ? `2 · Choose batch · ${dept?.label ?? ''}`
        : step === 'section'
          ? `3 · Choose section · ${batch?.label ?? ''}`
          : `4 · Pick people · ${section?.label ?? batch?.label ?? ''}`

  return {
    step,
    dept,
    batch,
    section,
    departments,
    batches,
    sections,
    people,
    goBack,
    pickDepartment,
    pickBatch,
    pickSection,
    crumb,
  }
}
