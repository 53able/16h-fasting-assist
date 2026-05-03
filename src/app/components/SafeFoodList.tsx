/**
 * SafeFoodList Component
 * Displays a list of safe foods that can be consumed during fasting without breaking ketosis.
 */

interface SafeFood {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  calories: string;
}

const SAFE_FOODS: SafeFood[] = [
  {
    id: 'nuts',
    name: '素焼きナッツ',
    nameEn: 'Unsalted Nuts',
    description: '良質な脂質とタンパク質を含む。少量で空腹感を緩和できる。',
    calories: '約170kcal / 30g',
  },
  {
    id: 'salad',
    name: '生野菜サラダ',
    nameEn: 'Raw Vegetable Salad',
    description: '低カロリーで食物繊維が豊富。血糖値への影響が少なく断食中でも摂取可能。',
    calories: '約20kcal / 100g',
  },
  {
    id: 'cheese',
    name: 'チーズ',
    nameEn: 'Cheese',
    description: 'タンパク質とカルシウムが豊富。少量で満足感が得られる。',
    calories: '約100kcal / 30g',
  },
  {
    id: 'yogurt',
    name: 'ヨーグルト',
    nameEn: 'Yogurt',
    description: '腸内環境を整える善玉菌を含む。無糖タイプを選ぶこと。',
    calories: '約60kcal / 100g',
  },
  {
    id: 'zero-drink',
    name: 'ゼロカロリー飲料',
    nameEn: 'Zero-Calorie Drinks',
    description: 'カロリーゼロの飲料で水分補給。カフェイン入りは適量を守ること。',
    calories: '0kcal',
  },
];

interface SafeFoodListProps {
  visible: boolean;
}

export function SafeFoodList({ visible }: SafeFoodListProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="断食中に食べられる安全な食品リスト"
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 700,
          color: '#111827',
        }}
      >
        断食中に食べられる食品
      </h3>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {SAFE_FOODS.map((food) => (
          <li
            key={food.id}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
                {food.name}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {food.calories}
              </span>
            </div>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontStyle: 'italic' }}>
              {food.nameEn}
            </span>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.5 }}>
              {food.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
