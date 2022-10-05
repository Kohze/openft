import * as React from 'react'

const SvgVainoex = (props) => (
  <svg
    width={175}
    height={48}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    {...props}
  >
    <path fill="url(#vainoex_svg__a)" d="M7 7h161.228v33.965H7z" />
    <defs>
      <pattern
        id="vainoex_svg__a"
        patternContentUnits="objectBoundingBox"
        width={1}
        height={1}
      >
        <use xlinkHref="#vainoex_svg__b" transform="scale(.00267 .01266)" />
      </pattern>
      <image
        id="vainoex_svg__b"
        width={375}
        height={79}
        xlinkHref="data:image/png;base64,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"
      />
    </defs>
  </svg>
)

export default SvgVainoex
