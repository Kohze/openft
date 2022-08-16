import { setCurrentStep } from '@/redux/slices/registration-form'
import { useDispatch, useSelector } from 'react-redux'
import { twMerge } from 'tailwind-merge'

export default function LineSteps({ list }) {
  const dispatch = useDispatch()

  return (
    <nav className="px-4 sm:px-0" aria-label="Progress">
      <ol role="list" className="flex max-w-md mx-auto space-x-8 space-y-0 ">
        {list.map((step) => (
          <li
            key={step.name}
            className={twMerge(
              'flex-1',
              step.status === 'completed'
                ? 'cursor-pointer'
                : 'pointer-events-none cursor-default',
            )}
            onClick={
              step.status === 'completed'
                ? () => dispatch(setCurrentStep(step.id))
                : () => {}
            }
          >
            <span
              className={twMerge(
                'flex flex-col py-1 pl-2 bg-gray-300 rounded-full hover:border-gray-300 md:pl-0 md:pt-2 md:pb-0',
                step.status === 'current' && 'bg-blue-600',
                step.status === 'completed' && 'bg-blue-400',
              )}
              aria-current="step"
            ></span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
