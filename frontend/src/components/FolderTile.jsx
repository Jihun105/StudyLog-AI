import { colorByKey, DEFAULT_FOLDER_TONE } from "./ColorPicker";

// 폴더를 사각형 카드 안에 폴더 아이콘을 넣는 대신, 카드 자체를 실제 폴더 모양(위쪽에
// 탭이 튀어나온 마닐라 폴더 실루엣)으로 잘라서 보여주는 타일. AllFoldersPage.jsx와
// HomePage.jsx의 폴더 그리드에서 공통으로 씀.
// clip-path로 폴더 모양을 만들기 때문에 일반 border는 잘린 모서리를 따라가지 못해서
// 안 씀 - 대신 배경색 자체(과 hover 시 살짝 밝아지는 것)로 경계를 표현하고,
// clip-path를 그대로 따라가는 filter: drop-shadow로 살짝 입체감만 줌.
const FOLDER_CLIP_PATH =
  "polygon(6% 14%, 12% 8%, 34% 8%, 40% 14%, 46% 20%, 88% 20%, 94% 26%, 94% 86%, 88% 92%, 12% 92%, 6% 86%)";

// color: 우클릭 메뉴에서 고른 색상 키(예: "blue") - 없으면 기본 회색 톤(DEFAULT_FOLDER_TONE).
// "미분류" 같은 가짜 폴더(muted)는 색이 지정돼 있어도 항상 흐린 회색으로 고정해서
// 실제 폴더와 구분되게 함
function FolderTile({ name, onClick, onContextMenu, title, muted = false, color = null }) {
  const tone = muted ? DEFAULT_FOLDER_TONE : (colorByKey(color) || DEFAULT_FOLDER_TONE);

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={title}
      className="group relative aspect-[5/4] w-full"
    >
      <span
        style={{ clipPath: FOLDER_CLIP_PATH }}
        className={`absolute inset-0 transition-colors duration-150 group-hover:[filter:drop-shadow(0_2px_3px_rgba(0,0,0,0.12))] dark:group-hover:[filter:drop-shadow(0_2px_4px_rgba(0,0,0,0.5))] ${
          muted ? "bg-gray-50 dark:bg-gray-800/60 group-hover:bg-gray-100 dark:group-hover:bg-gray-700/60" : `${tone.tile} ${tone.tileHover}`
        }`}
      />
      <span className="absolute inset-0 flex items-end justify-center px-2 pb-2">
        <span
          className={`text-xs font-medium truncate w-full text-center transition-colors ${
            muted ? "text-gray-400 dark:text-gray-500" : `${tone.text}`
          }`}
        >
          {name}
        </span>
      </span>
    </button>
  );
}

export default FolderTile;
