import { Component, Input } from '@angular/core';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { TextExercise } from 'app/entities/text-exercise.model';
import { TextExerciseService } from './text-exercise.service';
import { CourseExerciseService, CourseManagementService } from 'app/course/manage/course-management.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ActivatedRoute, Router } from '@angular/router';
import { ExerciseComponent } from 'app/exercises/shared/exercise/exercise.component';
import { TranslateService } from '@ngx-translate/core';
import { onError } from 'app/shared/util/global.utils';
import { AccountService } from 'app/core/auth/account.service';
import { SortService } from 'app/shared/service/sort.service';
import { TextExerciseImportComponent } from 'app/exercises/text/manage/text-exercise-import.component';
import { ExerciseService } from 'app/exercises/shared/exercise/exercise.service';
import { AlertService } from 'app/core/util/alert.service';
import { EventManager } from 'app/core/util/event-manager.service';

@Component({
    selector: 'jhi-text-exercise',
    templateUrl: './text-exercise.component.html',
})
export class TextExerciseComponent extends ExerciseComponent {
    @Input() textExercises: TextExercise[];

    constructor(
        public exerciseService: ExerciseService,
        private textExerciseService: TextExerciseService,
        private courseExerciseService: CourseExerciseService,
        private modalService: NgbModal,
        private router: Router,
        courseService: CourseManagementService,
        translateService: TranslateService,
        private alertService: AlertService,
        private sortService: SortService,
        eventManager: EventManager,
        route: ActivatedRoute,
        private accountService: AccountService,
    ) {
        super(courseService, translateService, route, eventManager);
        this.textExercises = [];
    }

    protected loadExercises(): void {
        this.courseExerciseService.findAllTextExercisesForCourse(this.courseId).subscribe(
            (res: HttpResponse<TextExercise[]>) => {
                this.textExercises = res.body!;

                // reconnect exercise with course
                this.textExercises.forEach((exercise) => {
                    exercise.course = this.course;
                    this.accountService.setAccessRightsForExercise(exercise);
                });
                this.emitExerciseCount(this.textExercises.length);
            },
            (res: HttpErrorResponse) => onError(this.alertService, res),
        );
    }

    /**
     * Returns the unique identifier for items in the collection
     * @param index of a text exercise in the collection
     * @param item current text exercise
     */
    trackId(index: number, item: TextExercise) {
        return item.id;
    }

    protected getChangeEventName(): string {
        return 'textExerciseListModification';
    }

    sortRows() {
        this.sortService.sortByProperty(this.textExercises, this.predicate, this.reverse);
    }

    /**
     * Used in the template for jhiSort
     */
    callback() {}

    openImportModal() {
        const modalRef = this.modalService.open(TextExerciseImportComponent, { size: 'lg', backdrop: 'static' });
        modalRef.result.then(
            (result: TextExercise) => {
                this.router.navigate(['course-management', this.courseId, 'text-exercises', result.id, 'import']);
            },
            () => {},
        );
    }
}
