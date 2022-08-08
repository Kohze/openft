import { QuestionMarkCircleIcon } from '@heroicons/react/outline'
import ReactTooltip from 'react-tooltip'
import { twMerge } from 'tailwind-merge'
import PropTypes from 'prop-types'

const InputMain = ({ className, children }) => {
  return (
    <div
      className={twMerge(
        'sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-b sm:border-gray-200 sm:pb-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

InputMain.Label = function InputMainLabel({
  label,
  className,
  htmlFor,
  subLabel,
}) {
  if (!label) return null

  return (
    <label
      htmlFor={htmlFor}
      className={twMerge(
        'block text-sm font-medium text-gray-700 sm:mt-px',
        !subLabel && 'sm:pt-2',
        className,
      )}
    >
      {label}
      {subLabel && (
        <span className="block font-normal text-gray-500">{subLabel}</span>
      )}
    </label>
  )
}

InputMain.Input = function InputMainInput({
  id,
  addon,
  variant,
  additionalCheckbox,
  inputType,
  className,
  inputClassName,
  tooltipText,
  ...props
}) {
  return (
    <div className={className}>
      {variant === 'add-on' && addon && (
        <div className="flex mt-1 rounded-md shadow-sm sm:mt-0">
          <span className="inline-flex items-center px-3 text-gray-500 border border-r-0 border-gray-200 rounded-l-md bg-gray-50 sm:text-sm">
            {addon}
          </span>
          <input
            id={id}
            type={inputType}
            className={twMerge(
              'flex-1 block w-full min-w-0 border-gray-200 rounded-none focus:ring-blue-500 focus:border-blue-500 rounded-r-md sm:text-sm',
              inputClassName,
            )}
            {...props}
          />
        </div>
      )}

      {variant === 'default' && (
        <div className="relative flex rounded-md shadow-sm">
          <input
            id={id}
            type={inputType}
            className={twMerge(
              'focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-200  rounded-md',
              inputClassName,
            )}
            {...props}
          />
          {!!tooltipText && (
            <div
              data-tip={tooltipText ? tooltipText : ''}
              className="absolute inset-y-0 right-0 z-50 inline-flex items-center pr-3 cursor-pointer group"
            >
              <QuestionMarkCircleIcon
                className="w-4 h-4 text-gray-400"
                aria-hidden="true"
              />
              <ReactTooltip />
            </div>
          )}
        </div>
      )}

      {additionalCheckbox && additionalCheckbox}
    </div>
  )
}

InputMain.Input.defaultProps = {
  inputType: 'text',
  variant: 'default',
}

InputMain.Input.propTypes = {
  inputType: PropTypes.string,
  variant: PropTypes.string,
}

export default InputMain
