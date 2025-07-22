export class PriorityQueue {

	maxJobs : number;
	autoUpdate : boolean;
	/** @deprecated */
	priorityCallback : ( itemA : any, itemB : any ) => number;
	priorityFunction : ( item : any ) => number;

	schedulingCallback : ( func : Function ) => void;

	sort() : void;
	add( item : any, callback : ( item : any ) => any ) : Promise< any >;
	remove( item : any ) : void;
	removeByFilter( filter : ( item : any ) => boolean ) : void;

	tryRunJobs() : void;
	scheduleJobRun() : void;

}
