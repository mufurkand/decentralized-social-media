import { ArrowBigDown, ArrowBigUp, UserPlus } from "lucide-react";
import Link from "next/link";
import { twJoin } from "tailwind-merge";

export default function Post({ isPage = false }: { isPage?: boolean }) {
  const content = (
    <div className={twJoin("flex flex-col gap-4", !isPage && "cursor-pointer")}>
      <div>
        <div>
          <div className="flex items-center gap-4">
            <div className="rounded-full w-12 h-12 bg-theme-splitter"></div>
            <div>
              <p>Lorem Ipsum</p>
              <p className="text-theme-primary">@loremipsum</p>
            </div>
            <UserPlus className="rounded-full p-1 bg-theme-accent" size={28} />
          </div>
        </div>
      </div>
      <div>
        <p>
          Lorem ipsum dolor sit, amet consectetur adipisicing elit. Temporibus
          nobis ullam a recusandae voluptate delectus quod libero et illum
          repellendus?
        </p>
      </div>
      <div className="w-full h-24 bg-theme-splitter rounded-md"></div>
      <div className="flex gap-4 text-theme-accent">
        <div className="flex items-center gap-0.5 h-8">
          <ArrowBigUp
            className="rounded-l-full p-1 bg-theme-primary-muted h-full"
            size={28}
          />
          <div className="p-1 px-2 bg-theme-primary-muted h-full">7</div>
          <ArrowBigDown
            className="rounded-r-full p-1 bg-theme-primary-muted h-full"
            size={28}
          />
        </div>
        <div className="p-1 px-2 rounded-full bg-theme-primary-muted">
          <p>7$</p>
        </div>
      </div>
    </div>
  );

  return isPage ? content : <Link href="/post/1">{content}</Link>;
}
