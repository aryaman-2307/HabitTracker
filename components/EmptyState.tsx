export default function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-gray-300 dark:text-gray-600 mb-4">{icon}</div>}
      <h3 className="text-gray-500 dark:text-gray-400 font-medium">{title}</h3>
      {description && <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 max-w-sm">{description}</p>}
    </div>
  );
}
