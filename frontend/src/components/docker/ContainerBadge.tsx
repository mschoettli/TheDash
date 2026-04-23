import { DockerContainer } from "../../store/useDockerStore";
import StatusDot from "../ui/StatusDot";

interface Props {
  container: DockerContainer;
}

export default function ContainerBadge({ container }: Props) {
  const isRunning = container.state === "running";
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm">
      <StatusDot online={isRunning} />
      <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
        {container.name}
      </span>
      <span className="text-xs text-slate-400 truncate max-w-[100px] hidden sm:block">
        {container.image.split(":")[0]}
      </span>
    </div>
  );
}
