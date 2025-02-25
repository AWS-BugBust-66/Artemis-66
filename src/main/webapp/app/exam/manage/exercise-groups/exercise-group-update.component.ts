import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AlertService } from 'app/core/util/alert.service';
import { Observable } from 'rxjs';
import { ExerciseGroup } from 'app/entities/exercise-group.model';
import { ExerciseGroupService } from 'app/exam/manage/exercise-groups/exercise-group.service';
import { Exam } from 'app/entities/exam.model';
import { onError } from 'app/shared/util/global.utils';

@Component({
    selector: 'jhi-exercise-group-update',
    templateUrl: './exercise-group-update.component.html',
})
export class ExerciseGroupUpdateComponent implements OnInit {
    courseId: number;
    exam: Exam;
    exerciseGroup: ExerciseGroup;
    isSaving = false;

    constructor(private route: ActivatedRoute, private router: Router, private exerciseGroupService: ExerciseGroupService, private alertService: AlertService) {}

    /**
     * Initialize the courseId and exerciseGroup
     */
    ngOnInit(): void {
        this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
        this.route.data.subscribe(({ exam, exerciseGroup }) => {
            this.exam = exam;
            this.exerciseGroup = exerciseGroup;
        });
    }

    /**
     * Create the exercise group if no id is set.
     * Update the exercise group if an id is set.
     */
    save() {
        this.isSaving = true;
        if (this.exerciseGroup.id !== undefined) {
            this.subscribeToSaveResponse(this.exerciseGroupService.update(this.courseId, this.exam.id!, this.exerciseGroup));
        } else {
            this.exerciseGroup.exam = this.exam;
            this.subscribeToSaveResponse(this.exerciseGroupService.create(this.courseId, this.exam.id!, this.exerciseGroup));
        }
    }

    // tslint:disable-next-line:completed-docs
    previousState() {
        this.router.navigate(['course-management', this.courseId, 'exams', this.route.snapshot.paramMap.get('examId'), 'exercise-groups']);
    }

    private subscribeToSaveResponse(result: Observable<HttpResponse<ExerciseGroup>>) {
        result.subscribe(
            () => this.onSaveSuccess(),
            (err: HttpErrorResponse) => this.onSaveError(err),
        );
    }

    private onSaveSuccess() {
        this.isSaving = false;
        this.previousState();
    }

    private onSaveError(error: HttpErrorResponse) {
        onError(this.alertService, error);
        this.isSaving = false;
    }
}
