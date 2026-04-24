import { DockerContainer } from "../../store/useDockerStore";
import StatusDot from "../ui/StatusDot";

interface Props {
  container: DockerContainer;
}

export default function ContainerBadge({ container }: Props) {
  const isRunning = container.state === "running";
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-line/60 text-[13px]">
      <StatusDot online={isRunning} />
      <span className="font-medium text-t1 truncate max-w-[140px]">{container.name}</span>
      <span className="text-[11px] text-t3 truncate max-w-[100px] hidden sm:block">
        {container.image.split(":")[0]}
      </span>
    </div>
  );
}
