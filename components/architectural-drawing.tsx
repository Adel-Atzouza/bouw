type Props = {
  variant?: "extension" | "dormer" | "interior";
  compact?: boolean;
};

export default function ArchitecturalDrawing({
  variant = "extension",
  compact = false,
}: Props) {
  return (
    <svg
      viewBox="0 0 520 330"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="architectural-drawing"
    >
      <defs>
        <pattern
          id={`grid-${variant}-${compact}`}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M20 0H0V20"
            stroke="currentColor"
            strokeOpacity=".06"
            strokeWidth=".6"
          />
        </pattern>
      </defs>
      <rect
        width="520"
        height="330"
        fill={`url(#grid-${variant}-${compact})`}
      />
      {variant === "interior" ? (
        <g stroke="currentColor">
          <path d="M105 55H415V265H105Z" strokeWidth="5" />
          <path d="M110 145H230V60M230 185V260M300 150H410" strokeWidth="4" />
          <path
            d="M230 145v40a40 40 0 0 0 40-40h-40M300 150v40a40 40 0 0 1-40-40h40"
            strokeWidth="1"
          />
          <path
            d="M120 70h85v45h-85ZM130 78h25v28h-25m30-28h25v28h-25M325 170h65v65h-65ZM340 170v65M375 170v65"
            strokeWidth="1"
          />
          <rect x="135" y="180" width="50" height="55" rx="4" />
          <path d="M127 187v38M193 187v38M143 172h34M143 243h34" />
          <path
            d="M320 55v7h65v-7M320 265v-7h65v7M105 185h6v40h-6"
            strokeWidth="2"
          />
          <path
            d="M105 285v15m310-15v15M105 293h310M85 55H70m15 210H70M77 55v210"
            strokeWidth=".7"
          />
          <text x="247" y="289" fill="currentColor" stroke="none" fontSize="10">
            6.200
          </text>
          <text
            x="65"
            y="176"
            fill="currentColor"
            stroke="none"
            fontSize="10"
            transform="rotate(-90 65 176)"
          >
            4.200
          </text>
        </g>
      ) : (
        <g stroke="currentColor" strokeLinejoin="round">
          <path
            d="M75 156 213 64 352 156M89 148v119h250V148M76 156h275M89 267h337"
            strokeWidth="2"
          />
          <path
            d="m104 143 109-73 109 73M94 160h240M94 256h240M211 70v72"
            strokeWidth=".7"
          />
          <path
            d="M117 179h51v70h-51ZM190 179h51v70h-51ZM263 179h50v70h-50ZM141 179v70M215 179v70M288 179v70M117 211h51M190 211h51M263 211h50"
            strokeWidth="1.2"
          />
          {variant === "extension" ? (
            <>
              <path
                d="M339 188h109v79H339M336 181h116v8H336Z"
                strokeWidth="2"
              />
              <path
                d="M350 199h86v57h-86ZM378 199v57M407 199v57"
                strokeWidth="1.2"
              />
              <path
                d="M339 181v-14h113M350 172h85"
                strokeWidth=".6"
                strokeDasharray="3 3"
              />
            </>
          ) : (
            <>
              <path
                d="M157 140V100h112v40M152 96h122v7H152Z"
                fill="var(--soft)"
                strokeWidth="2"
              />
              <path
                d="M166 110h94v30h-94ZM197 110v30M229 110v30"
                strokeWidth="1"
              />
            </>
          )}
          <path
            d="M89 283v18m250-18v18M89 292h250M57 64h18M57 267h18M65 64v203"
            strokeWidth=".6"
          />
          <path
            d="m86 295 6-6m244 6 6-6M62 67l6-6M62 270l6-6"
            strokeWidth="1"
          />
          <path
            d="M105 169h24m10 0h35m10 0h35m10 0h35m10 0h35M99 258h31m10 0h32m10 0h32m10 0h32m10 0h32"
            strokeWidth=".5"
            opacity=".4"
          />
          <text x="197" y="288" fill="currentColor" stroke="none" fontSize="10">
            6.000
          </text>
          <text
            x="54"
            y="180"
            fill="currentColor"
            stroke="none"
            fontSize="10"
            transform="rotate(-90 54 180)"
          >
            5.400
          </text>
          <path d="M390 105v-40m-6 9 6-9 6 9" strokeWidth=".8" />
          <text x="386" y="57" fill="currentColor" stroke="none" fontSize="10">
            N
          </text>
        </g>
      )}
    </svg>
  );
}
